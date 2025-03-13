import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RpaHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [activeStatus, setActiveStatus] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('userName');
        
        if (role !== 'rpa') {
          router.replace('/(auth)/login');
          return;
        }
        
        if (name) {
          setUserName(name);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking auth status:', error);
        router.replace('/(auth)/login');
      }
    };
    
    checkAuthStatus();
  }, [router]);

  const toggleActiveStatus = () => {
    setActiveStatus(!activeStatus);
    // You could send this status to your server if needed
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userId', 'userRole', 'userName']);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Logout failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="text-2xl font-bold mb-2">Welcome, {userName || 'RPA'}</Text>
      
      <View className="bg-gray-100 p-4 rounded-lg w-full max-w-md mb-6">
        <Text className="text-lg font-semibold mb-2">Your Status</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-base">Available for student chats:</Text>
          <TouchableOpacity
            onPress={toggleActiveStatus}
            className={`px-3 py-1 rounded ${activeStatus ? 'bg-green-500' : 'bg-gray-400'}`}
          >
            <Text className="text-white font-medium">{activeStatus ? 'Active' : 'Inactive'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity
        className="bg-blue-500 px-6 py-3 rounded-lg w-full max-w-md mb-4"
        onPress={() => router.push('/(rpa)/chat')}
      >
        <Text className="text-white font-bold text-center text-lg">Open Chat Console</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        className="bg-gray-200 px-6 py-3 rounded-lg w-full max-w-md"
        onPress={handleLogout}
      >
        <Text className="text-gray-800 font-medium text-center">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}