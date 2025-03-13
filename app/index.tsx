// app/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-xl font-bold mb-4">Welcome to RestorativeBridge</Text>
      <TouchableOpacity
        className="bg-blue-500 px-4 py-2 rounded"
        onPress={() => router.push('/(auth)/login')}
      >
        <Text className="text-white">Go to Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="bg-blue-500 px-4 py-2 rounded"
        onPress={() => router.push('/(auth)/register')}
      >
        <Text className="text-white">Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}
