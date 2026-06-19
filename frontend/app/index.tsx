import { Redirect } from 'expo-router';
import { useAuthStore } from './hooks/useAuthStore';

export default function Index() {
  const user = useAuthStore(s => s.user);
  if (!user) return <Redirect href="/login" />;
  if (user.role === 'clerk') return <Redirect href="/(clerk)/dashboard" />;
  return <Redirect href="/(citizen)/track" />;
}
