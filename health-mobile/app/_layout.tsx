import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import '../src/styles/global.css';
import { AuthProvider } from '../src/auth/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
