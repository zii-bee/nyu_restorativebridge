import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const startAuthenticatedSession = (req, user) => {
  return new Promise((fulfill, reject) => {
    req.session.regenerate((err) => {
      if (!err) {
        req.session.user = user; 
        fulfill(user);
      } else {
        reject(err);
      }
    });
  });
};

const endAuthenticatedSession = req => {
  return new Promise((fulfill, reject) => {
    req.session.destroy(err => err ? reject(err) : fulfill(null));
  });
};

const register = async (name, email, password) => {
  if (name.length < 3 || password.length < 7) {
    throw { message: 'NAME OR PASSWORD TOO SHORT' };
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { message: 'EMAIL ALREADY EXISTS' };
  }
  // Create a new user using the plain text password (it will be hashed in the pre-save hook)
  const user = new User({
    name,
    email,
    password,
    role: 'student'
  });
  await user.save();
  return user;
};

const login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw { message: "USER NOT FOUND" };
  }
  // Compare the plain text password with the hashed password stored in the database
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw { message: "PASSWORDS DO NOT MATCH" };
  }
  return user;
};

const googleSign = async (profileId, profileData) => {
  let user = await User.findOne({ googleId: profileId });
  if (!user) {
    user = new User({
      name: profileData.displayName,
      email: profileData.email,
      googleId: profileId,
      profilePicture: profileData.picture
      // No manual salt here
    });
    await user.save();
  }
  return user;
};

export {
  startAuthenticatedSession,
  endAuthenticatedSession,
  register,
  login,
  googleSign
};
