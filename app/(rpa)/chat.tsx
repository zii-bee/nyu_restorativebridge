const SERVERURL = 'https://0070-5-195-74-111.ngrok-free.app';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RpaChat() {
  const [messages, setMessages] = useState<{ sender: string; text: string; timestamp?: Date }[]>([]);
  const [input, setInput] = useState('');
  const [activeChats, setActiveChats] = useState<{ studentId: string; anonymous: boolean }[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedRole = await AsyncStorage.getItem('userRole');
        
        if (!storedUserId || storedRole !== 'rpa') {
          router.replace('/(auth)/login');
          return;
        }
        
        setUserId(storedUserId);
        setLoading(false);
      } catch (error) {
        console.error('Error loading user info:', error);
        router.replace('/(auth)/login');
      }
    };
    
    loadUserInfo();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    
    socketRef.current = io(SERVERURL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current.on("connect", () => {
      console.log("RPA connected to socket server");
      socketRef.current.emit('register', { userId, role: 'rpa' });
    });

    socketRef.current.on("newChat", (data: { studentId: string; anonymous: boolean }) => {
      console.log("New chat request received:", data);
      setActiveChats(prev => [...prev, data]);
      // If this is the first chat, set it as current automatically
      if (!currentChat) {
        setCurrentChat(data.studentId);
      }
    });

    socketRef.current.on("message", (data: { sender: string; text: string; studentId: string }) => {
      if (data.studentId === currentChat) {
        setMessages(prev => [...prev, { 
          sender: 'student', 
          text: data.text,
          timestamp: new Date() 
        }]);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId, currentChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const sendMessage = () => {
    if (input.trim().length > 0 && currentChat) {
      const messageData = { 
        sender: 'rpa', 
        text: input, 
        studentId: currentChat,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, { sender: 'rpa', text: input, timestamp: new Date() }]);
      
      if (socketRef.current) {
        socketRef.current.emit('message', messageData);
      }
      
      setInput('');
    }
  };

  const switchChat = (studentId: string) => {
    setCurrentChat(studentId);
    setMessages([]); // Clear messages when switching chats
  };

  const endChat = (studentId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('endChat', { studentId });
      setActiveChats(prev => prev.filter(chat => chat.studentId !== studentId));
      
      if (currentChat === studentId) {
        setCurrentChat(activeChats.length > 1 ? activeChats[0].studentId : null);
        setMessages([]);
      }
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Active chats list */}
      <View className="bg-gray-100 p-2">
        <Text className="font-bold mb-2">Active Chats:</Text>
        {activeChats.length === 0 ? (
          <Text className="italic text-gray-500">No active chats</Text>
        ) : (
          <FlatList
            horizontal
            data={activeChats}
            keyExtractor={(item) => item.studentId}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`py-1 px-3 mr-2 rounded-full ${currentChat === item.studentId ? 'bg-blue-500' : 'bg-gray-300'}`}
                onPress={() => switchChat(item.studentId)}
              >
                <Text className={currentChat === item.studentId ? 'text-white' : 'text-black'}>
                  {item.anonymous ? 'Anonymous Student' : `Student ${item.studentId.substring(0, 5)}`}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Chat area */}
      {currentChat ? (
        <View className="flex-1 p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="font-bold">
              {activeChats.find(c => c.studentId === currentChat)?.anonymous 
                ? 'Anonymous Student' 
                : `Student ${currentChat.substring(0, 8)}...`}
            </Text>
            <TouchableOpacity
              className="bg-red-500 px-3 py-1 rounded"
              onPress={() => endChat(currentChat)}
            >
              <Text className="text-white">End Chat</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View className={`p-3 my-1 max-w-3/4 rounded-lg ${
                item.sender === 'rpa' ? 'bg-blue-200 self-end' : 'bg-gray-200 self-start'
              }`}>
                <Text>{item.text}</Text>
                {item.timestamp && (
                  <Text className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            )}
            contentContainerStyle={{ flexGrow: 1 }}
          />
          
          <View className="flex-row items-center mt-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message"
              className="border border-gray-300 rounded px-4 py-2 flex-1 mr-2"
              multiline
            />
            <TouchableOpacity 
              onPress={sendMessage} 
              className="bg-blue-500 p-3 rounded-full"
            >
              <Text className="text-white">Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg text-gray-500">No active chat selected</Text>
          <Text className="text-sm text-gray-400 mt-2">
            Wait for a student to connect or select a chat from above
          </Text>
        </View>
      )}
    </View>
  );
}