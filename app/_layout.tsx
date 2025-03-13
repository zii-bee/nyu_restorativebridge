// app/_layout.tsx
import React from 'react';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import './globals.css'; 

export default function RootLayout() {
  return (
    <View className="flex-1 bg-white">
      {/* 
        Slot is where child routes will be rendered.
        This ensures all pages in /app share this layout.
      */}
      <Slot />
    </View>
  );
}
