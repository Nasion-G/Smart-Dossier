import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors, Typography, BorderRadius } from '../constants/design';

interface TopAppBarProps {
  viewLabel: string;
  userInitials: string;
  onMenuPress?: () => void;
}

export function TopAppBar({ viewLabel, userInitials, onMenuPress }: TopAppBarProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {isMobile && onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.brandIcon}>⚖</Text>
        <Text style={styles.brandText}>EKB · Smart Dossier</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.viewLabel}>{viewLabel}</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.iconText}>{'\u25C9'}</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 56,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    flexShrink: 0,
    zIndex: 50,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    padding: 4,
    marginRight: 4,
  },
  menuIcon: {
    fontSize: 20,
    color: Colors.onSurfaceVariant,
  },
  brandIcon: {
    fontSize: 24,
    color: Colors.primary,
  },
  brandText: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 18,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  iconBtn: {
    padding: 6,
    borderRadius: BorderRadius.full,
  },
  iconText: {
    fontSize: 20,
    color: Colors.onSurfaceVariant,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 12,
    color: Colors.onSecondary,
  },
});
