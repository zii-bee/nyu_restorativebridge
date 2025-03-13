// Loads environment variables from .env
import express from 'express';
import session from 'express-session';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import sanitize from 'mongo-sanitize';
import User from './models/User.js';
import ngrok from '@ngrok/ngrok';  // Import ngrok
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import * as auth from './auth/auth.js';

const app = express();

app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.DSN }),
  cookie: {
    maxAge: 1000 * 60 * 60,
    secure: true, // For HTTPS; switch to false during local development if needed
    sameSite: 'lax'
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

const server = http.createServer(app);
const io = new socketIo(server, {
  cors: {
    origin: '*', // Adjust for production to limit allowed origins
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB Atlas using the connection string in .env
mongoose
  .connect(process.env.DSN)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

let activeSessions = {};
let socketUserMap = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/auth/login', async (req, res) => {
  try {
    const user = await auth.login(
      sanitize(req.body.email),
      req.body.password
    );
    await auth.startAuthenticatedSession(req, user);
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.render('login', { message: err.message || 'Login unsuccessful' });
  }
});

app.post('/auth/register', async (req, res) => {
  try {
    const newUser = await auth.register(
      sanitize(req.body.name),
      sanitize(req.body.email),
      req.body.password
    );
    await auth.startAuthenticatedSession(req, newUser);
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message || 'Registration error'
    });
  }
});

// Socket.io event handling
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on('login', async (data) => {
    try {
      console.log('Login attempt:', data.email);
      const user = await User.findOne({ email: data.email });
      
      if (!user) {
        console.log('Login failed: User not found');
        socket.emit('loginResponse', { 
          success: false, 
          message: 'User not found'
        });
        return;
      }
      
      // Use the comparePassword method defined on the User model
      const isMatch = await user.comparePassword(data.password);
      
      if (!isMatch) {
        console.log('Login failed: Invalid password');
        socket.emit('loginResponse', { 
          success: false, 
          message: 'Invalid password'
        });
        return;
      }
      
      // User found and password matches
      socketUserMap[socket.id] = { 
        userId: user._id.toString(), 
        role: user.role 
      };
      
      if (user.role === 'rpa') {
        if (!activeSessions[user._id.toString()]) {
          activeSessions[user._id.toString()] = [];
        }
      }
      
      // Ensure we're sending all the required data
      console.log('Sending successful login response for:', user.email);
      socket.emit('loginResponse', {
        success: true,
        userId: user._id.toString(),
        role: user.role,
        name: user.name
      });
      
      console.log(`User ${user.email} logged in successfully as ${user.role}`);
    } catch (error) {
      console.error('Login error:', error);
      socket.emit('loginResponse', { 
        success: false, 
        message: 'Server error during login'
      });
    }
  });

  // Additional socket events (register, requestChat, etc.) remain unchanged
  socket.on('register', (data) => {
    const { userId, role } = data;
    socketUserMap[socket.id] = { userId, role };
    console.log(`User registered: ${userId} as ${role}`);

    if (role === 'rpa') {
      if (!activeSessions[userId]) {
        activeSessions[userId] = [];
      }
    }
  });

  socket.on('requestChat', (data) => {
    const { studentId, anonymous } = data;
    console.log(`Student ${studentId} requested a chat`);
    let alreadyActive = false;
    for (const rpa in activeSessions) {
      if (activeSessions[rpa].includes(studentId)) {
        alreadyActive = true;
        break;
      }
    }
    if (alreadyActive) {
      socket.emit('chatError', { message: 'You are already in an active chat.' });
      return;
    }

    let selectedRpaId = null;
    let minChats = Infinity;
    for (const rpaId in activeSessions) {
      const numChats = activeSessions[rpaId].length;
      if (numChats < minChats) {
        minChats = numChats;
        selectedRpaId = rpaId;
      }
    }

    if (selectedRpaId) {
      activeSessions[selectedRpaId].push(studentId);
      activeSessions[selectedRpaId] = [...new Set(activeSessions[selectedRpaId])];
      console.log(`Student ${studentId} assigned to RPA ${selectedRpaId}`);

      let rpaSocketId = null;
      for (const sId in socketUserMap) {
        if (socketUserMap[sId].userId === selectedRpaId && socketUserMap[sId].role === 'rpa') {
          rpaSocketId = sId;
          break;
        }
      }
      if (rpaSocketId) {
        socket.emit('rpaJoined');
        io.to(rpaSocketId).emit('newChat', { studentId, anonymous });
      } else {
        socket.emit('chatError', { message: 'No active RPA found. Please try again later.' });
      }
    } else {
      socket.emit('chatError', { message: 'No active RPA available. Please try again later.' });
    }
  });

  socket.on('message', (data) => {
    console.log('Message received:', data);
    // Find the target socket to send to
    if (data.sender === 'student') {
      // Send to RPA
      let rpaSocketId = null;
      for (const rpaId in activeSessions) {
        if (activeSessions[rpaId].includes(data.studentId)) {
          for (const sId in socketUserMap) {
            if (socketUserMap[sId].userId === rpaId) {
              rpaSocketId = sId;
              break;
            }
          }
        }
      }
      if (rpaSocketId) {
        io.to(rpaSocketId).emit('message', data);
      }
    } else {
      // Send to student
      let studentSocketId = null;
      for (const sId in socketUserMap) {
        if (socketUserMap[sId].userId === data.studentId) {
          studentSocketId = sId;
          break;
        }
      }
      if (studentSocketId) {
        io.to(studentSocketId).emit('message', data);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const userData = socketUserMap[socket.id];
    if (userData) {
      const { userId, role } = userData;
      if (role === 'rpa') {
        if (activeSessions[userId]) {
          activeSessions[userId].forEach((studentId) => {
            io.emit('rpaDisconnected', { studentId });
          });
          delete activeSessions[userId];
        }
      } else if (role === 'student') {
        for (const rpaId in activeSessions) {
          activeSessions[rpaId] = activeSessions[rpaId].filter((id) => id !== userId);
        }
      }
      delete socketUserMap[socket.id];
    }
  });
});

app.get('/', (req, res) => {
  res.send('Server is running.');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  ngrok.connect({ addr: PORT, authtoken_from_env: true })
    .then(listener => {
      console.log(`Ingress established at: ${listener.url()}`);
      app.use(cors({
        origin: [
          'http://localhost:8081', // Your React Native app's origin
          listener.url() // Ngrok URL
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }));
    });
});
