import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from './constants/design';
import { useAuthStore } from './hooks/useAuthStore';
import type { UserRole } from './types';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const { register, isLoading, error, clearError } = useAuthStore();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.wordmark}>EKB</Text>
          <Text style={styles.brand}>Create Account</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input} value={fullName}
              onChangeText={t => { clearError(); setFullName(t); }}
              placeholder="Full Name" placeholderTextColor={Colors.outline}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input} value={email}
              onChangeText={t => { clearError(); setEmail(t); }}
              autoCapitalize="none" keyboardType="email-address"
              placeholder="name@example.com" placeholderTextColor={Colors.outline}
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password (min 8 characters)</Text>
            <TextInput
              style={styles.input} value={password}
              onChangeText={t => { clearError(); setPassword(t); }}
              secureTextEntry placeholder="••••••••" placeholderTextColor={Colors.outline}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Account Type</Text>
            <View style={styles.roleRow}>
              {(['citizen', 'clerk'] as UserRole[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {r === 'citizen' ? '👤 Citizen' : '🏛 Clerk'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={() => register({ email, password, full_name: fullName, role })}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={Colors.onSecondary} size="small" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity><Text style={styles.footerLink}>Sign In</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.marginPage, gap: Spacing.stackMd },
  header: { alignItems: 'center', marginBottom: 8 },
  wordmark: { ...Typography.displayLg, color: Colors.inversePrimary, fontSize: 48, marginBottom: 6 },
  brand: { ...Typography.headlineSm, color: Colors.onPrimary },
  card: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, padding: 20, gap: Spacing.stackMd },
  errorBox: { backgroundColor: Colors.errorContainer, borderRadius: BorderRadius.md, padding: 12 },
  errorText: { ...Typography.bodySm, color: Colors.onErrorContainer },
  field: { gap: 6 },
  label: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  input: { height: 48, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: BorderRadius.lg, paddingHorizontal: 14, ...Typography.bodyLg, color: Colors.onSurface, backgroundColor: Colors.surfaceContainerLow },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, height: 48, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerLow },
  roleBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  roleBtnText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontFamily: 'Inter_500Medium' },
  roleBtnTextActive: { color: Colors.onSecondary, fontFamily: 'Inter_600SemiBold' },
  btn: { height: 52, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...Typography.headlineSm, color: Colors.onSecondary, fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  footerLink: { ...Typography.bodySm, color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
});
