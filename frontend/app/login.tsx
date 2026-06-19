import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from './constants/design';
import { useAuthStore } from './hooks/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.wordmark}>EKB</Text>
          <Text style={styles.brand}>Smart Dossier</Text>
          <Text style={styles.subtitle}>EKB Case Management System</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={t => { clearError(); setEmail(t); }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor={Colors.outline}
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={t => { clearError(); setPassword(t); }}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={Colors.outline}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={() => login({ email, password })}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={Colors.onPrimary} size="small" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Demo accounts hint */}
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo accounts</Text>
          <Text style={styles.demoText}>Clerk: clerk@ekb.gov / test1234</Text>
          <Text style={styles.demoText}>Citizen: alice@mail.com / test1234</Text>
        </View>

        <Text style={styles.version}>EKB · Privatization v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.marginPage, gap: Spacing.stackMd },
  header: { alignItems: 'center', marginBottom: 8 },
  wordmark: { ...Typography.displayLg, color: Colors.inversePrimary, fontSize: 52, marginBottom: 6 },
  brand: { ...Typography.headlineMd, color: Colors.onPrimary, marginBottom: 4 },
  subtitle: { ...Typography.bodySm, color: Colors.onPrimaryContainer, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 20,
    gap: Spacing.stackMd,
  },
  cardTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  errorBox: { backgroundColor: Colors.errorContainer, borderRadius: BorderRadius.md, padding: 12 },
  errorText: { ...Typography.bodySm, color: Colors.onErrorContainer },
  field: { gap: 6 },
  label: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
  },
  btn: {
    height: 52,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...Typography.headlineSm, color: Colors.onSecondary, fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  footerLink: { ...Typography.bodySm, color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
  demoBox: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xl,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  demoTitle: { ...Typography.labelCaps, color: Colors.inversePrimary, marginBottom: 4 },
  demoText: { ...Typography.bodySm, color: Colors.onPrimaryContainer, fontSize: 12 },
  version: { ...Typography.labelCaps, color: Colors.onPrimaryContainer, textAlign: 'center' },
});
