// app/(auth)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    // The Stack component sets up a stack-based navigation for all screens in (auth)
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#f0f0f0' },
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}
