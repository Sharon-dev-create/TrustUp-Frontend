import { AuthProvider, useAuth } from '../context/auth.context';import { Slot, useRouter, useSegments } from 'expo-router';import { ActivityIndicator, View } from 'react-native';import { SafeAreaProvider } from 'react-native-safe-area-context';import { useEffect } from 'react';import '../global.css';function Gate() {
  const { token, user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    const auth = segments[0] === 'sign-in' || segments[0] === 'create-account';
    if (!token || !user) {
      if (!auth) router.replace('/sign-in');
    } else if (auth) {
      router.replace('/($tabs)');
    }
  }, [token, user, isLoading, segments, router]);
  if (isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  return <Slot />;
}

export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><Gate /></AuthProvider></SafeAreaProvider>;
}
