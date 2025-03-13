// app/(student)/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function StudentHome() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold mb-4">Welcome, Student!</Text>
      <TouchableOpacity
        className="bg-green-500 px-4 py-2 rounded"
        onPress={() => router.push('/(student)/chat')}
      >
        <Text className="text-white font-bold">Get in touch with active RPA</Text>
      </TouchableOpacity>
    </View>
  );
}
