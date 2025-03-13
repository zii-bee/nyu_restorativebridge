const SERVERURL = 'https://f82f-5-195-74-111.ngrok-free.app';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async () => {
    try {
      const response = await fetch(`${SERVERURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        router.replace('/(auth)/login');
      } else {
        alert('Registration failed: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration error: Check console for details');
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-4">
      <Text className="text-2xl font-bold mb-4">Register</Text>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        className="border border-gray-300 rounded px-4 py-2 mb-4 w-full"
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="border border-gray-300 rounded px-4 py-2 mb-4 w-full"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-gray-300 rounded px-4 py-2 mb-4 w-full"
      />
      <TouchableOpacity
        className="bg-blue-500 px-4 py-2 rounded"
        onPress={handleRegister}
      >
        <Text className="text-white font-bold">Register</Text>
      </TouchableOpacity>
    </View>
  );
}
