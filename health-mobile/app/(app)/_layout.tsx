import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../../src/auth/authContext';

export default function AppLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>로딩 중...</Text>
      </View>
    );
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
