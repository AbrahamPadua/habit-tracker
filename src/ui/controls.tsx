import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { space, type, useTheme } from './theme';

export function Chip({
  label,
  selected,
  onPress,
  ink,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  ink?: string;
}) {
  const t = useTheme();
  const c = ink ?? t.action;
  return (
    <Pressable
      onPress={onPress}
      // 36dp chip + 6dp slop each side = the 48dp touch target
      hitSlop={6}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected ? { backgroundColor: c, borderColor: c } : { borderColor: t.faint, backgroundColor: t.card },
      ]}
    >
      <Text style={[type.meta, { fontWeight: '600', color: selected ? t.onAction : t.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  kind = 'filled',
  busy,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'filled' | 'tonal' | 'text';
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const bg = kind === 'filled' ? t.action : kind === 'tonal' ? t.tonal : 'transparent';
  const fg = kind === 'filled' ? t.onAction : t.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'text' && styles.textButton,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[type.title, { fontSize: 15, color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionLabel}>
      <Text style={[type.label, { color: t.muted }]}>{children}</Text>
      {right}
    </View>
  );
}

/** Inline error: no red in this app, so an icon and a live region carry the state. */
export function ErrorText({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={t.ink} />
      <Text style={[type.meta, { color: t.ink, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** The one primary action on a screen: add. */
export function Fab({ onPress, label }: { onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.fab, { backgroundColor: t.action }]} accessibilityRole="button" accessibilityLabel={label}>
      <MaterialCommunityIcons name="plus" size={28} color={t.onAction} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  error: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', marginVertical: space.sm },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginVertical: 6,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: { paddingHorizontal: space.md },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
});
