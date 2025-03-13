// app/(student)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: 'Student Area',
        headerStyle: { backgroundColor: '#DCEFFF' },
      }}
    />
  );
}
