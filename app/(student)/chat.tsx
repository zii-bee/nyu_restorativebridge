const SERVERURL = 'https://f82f-5-195-74-111.ngrok-free.app';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StudentChat() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Please wait, connecting you to an active RPA...');
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      // Get userId from AsyncStorage and request a chat
      AsyncStorage.getItem('userId').then(userId => {
        if (userId) {
          socketRef.current.emit('requestChat', { 
            studentId: userId,
            anonymous: false // Or provide an option for anonymous chats
          });
        }
      });
    }
  }, [socketRef.current?.connected]);

  useEffect(() => {
    // Replace with your actual Socket.io server URL or use an env variable.
    socketRef.current = io(SERVERURL, {
      transports: ['websocket'],
      reconnection: true,
    });

    // Socket event: on connection
    socketRef.current.on("connect", () => {
      console.log("Connected to socket server");
    });

    // Socket event: when an RPA joins the chat
    socketRef.current.on("rpaJoined", () => {
      setStatus("An active RPA has joined the chat!");
    });

    // Socket event: receiving a new message
    socketRef.current.on("message", (data: { sender: string; text: string }) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Socket event: when an RPA disconnects mid-chat
    socketRef.current.on("rpaDisconnected", () => {
      setStatus("The RPA has disconnected, chat ended.");
    });

    // Cleanup the connection when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const sendMessage = async () => {
    if (input.trim().length > 0) {
      try {
        const userId = await AsyncStorage.getItem('userId');
        
        if (!userId) {
          console.error("Cannot send message: userId not found in AsyncStorage");
          return;
        }
        
        const messageData = { 
          sender: 'student', 
          text: input,
          studentId: userId  // Add the studentId to the message data
        };
        
        // Append the message locally for immediate UI feedback
        setMessages((prev) => [...prev, messageData]);
        
        // Emit the message to the server
        if (socketRef.current) {
          socketRef.current.emit('message', messageData);
        }
        
        setInput('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-center mb-2">{status}</Text>
      
      <FlatList
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View className={`p-2 my-1 rounded-lg ${item.sender === 'student' ? 'bg-blue-200 self-end' : 'bg-gray-200 self-start'}`}>
            <Text>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ flexGrow: 1 }}
      />
      
      <View className="flex-row items-center mt-4">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          className="border border-gray-300 rounded px-4 py-2 flex-1 mr-2"
        />
        <TouchableOpacity onPress={sendMessage} className="bg-blue-500 p-2 rounded">
          <Text className="text-white">Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
