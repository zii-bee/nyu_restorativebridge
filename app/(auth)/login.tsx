const SERVERURL = 'https://0070-5-195-74-111.ngrok-free.app';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  useEffect(() => {
    // Check if already logged in
    const checkLoginStatus = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const userRole = await AsyncStorage.getItem('userRole');
        
        if (userId && userRole) {
          console.log('User already logged in:', { userId, userRole });
          redirectBasedOnRole(userRole);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };
    
    checkLoginStatus();
  }, []);

  const redirectBasedOnRole = (role: string) => {
    if (role === 'student') {
      router.replace('/(student)');
    } else if (role === 'rpa') {
      router.replace('/(rpa)');
    } else if (role === 'admin') {
      router.replace('/(admin)');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('Connecting to server...');

    // Create a new socket connection for login
    const socket = io(SERVERURL, {
      transports: ['websocket'],
      reconnection: true,
      timeout: 10000
    });

    // Setup handlers
    socket.on('connect', () => {
      console.log('Socket connected for login');
      setConnectionStatus('Connected, attempting login...');
      
      // Emit login event
      socket.emit('login', { email, password });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsLoading(false);
      setConnectionStatus('Connection failed');
      Alert.alert('Connection Error', 'Failed to connect to the server. Please check your internet connection and try again.');
      socket.disconnect();
    });

    socket.on('loginResponse', async (response) => {
      console.log('Login response received:', response);
      setConnectionStatus('Login response received');
      
      if (response.success) {
        try {
          // Store user data
          await AsyncStorage.multiSet([
            ['userId', response.userId],
            ['userRole', response.role],
            ['userName', response.name || '']
          ]);
          
          socket.disconnect();
          setIsLoading(false);
          redirectBasedOnRole(response.role);
        } catch (error) {
          console.error('Error storing login data:', error);
          Alert.alert('Login Error', 'Failed to save login information');
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
        socket.disconnect();
      }
    });

    // Set a timeout to handle cases where the server doesn't respond
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setConnectionStatus('Server timeout');
        Alert.alert('Timeout', 'Server did not respond in time. Please try again.');
        socket.disconnect();
      }
    }, 15000);
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-4">
      <Text className="text-2xl font-bold mb-4">Login</Text>
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="border border-gray-300 rounded px-4 py-2 mb-4 w-full"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-gray-300 rounded px-4 py-2 mb-4 w-full"
      />
      
      {isLoading ? (
        <View className="items-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-2 text-gray-600">{connectionStatus}</Text>
        </View>
      ) : (
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded w-full"
          onPress={handleLogin}
        >
          <Text className="text-white font-bold text-center">Login</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        className="mt-4" 
        onPress={() => router.push('/(auth)/register')}
      >
        <Text className="text-blue-500">Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}