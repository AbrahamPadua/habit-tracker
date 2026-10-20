import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { type, useTheme } from './theme';

interface Props {
  stamped: boolean;
  ink: string;
  /** Short text inside the stamp, e.g. "MON". */
  mark: string;
  label: string;
  onPress?: () => void;
  size?: number;
}

/** The check control: an empty slot that takes a rotated ink stamp. Read-only when onPress is absent. */
export function Stamp({ stamped, ink, mark, label, onPress, size = 40 }: Props) {
  const t = useTheme();
  const land = useRef(new Animated.Value(stamped ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || !stamped) return land.setValue(stamped ? 1 : 0);
      land.setValue(0);
      Animated.spring(land, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }).start();
    });
  }, [stamped, land]);

  const onPressIn = () =>
    Animated.timing(press, { toValue: 0.86, duration: 70, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(press, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  const slot = (
    <Animated.View
      style={[
        styles.slot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          // Read-only blanks are dashed so the partner's slots never look tappable.
          borderColor: t.faint,
          borderStyle: onPress ? 'solid' : 'dashed',
          transform: [{ scale: press }],
        },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.stamp,
          {
            borderRadius: size / 2,
            borderColor: ink,
            backgroundColor: ink + '1F',
            opacity: land,
            transform: [
              { rotate: '-12deg' },
              { scale: land.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) },
            ],
          },
        ]}
      >
        <Text style={[type.stamp, { color: ink }]} allowFontScaling={false}>
          {mark}
        </Text>
      </Animated.View>
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View style={styles.hit} accessible accessibilityLabel={`${label}, ${stamped ? 'done' : 'not recorded'}`}>
        {slot}
      </View>
    );
  }
  return (
    <Pressable
      style={styles.hit}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: stamped }}
      accessibilityLabel={label}
      hitSlop={4}
    >
      {slot}
    </Pressable>
  );
}

/** N punch slots for weekly targets, filled left to right. */
export function Punches({ count, target, ink }: { count: number; target: number; ink: string }) {
  const t = useTheme();
  return (
    <View style={styles.punches} accessible accessibilityLabel={`${count} of ${target} this week`}>
      {Array.from({ length: target }, (_, i) => (
        <View
          key={i}
          style={[
            styles.punch,
            i < count ? { backgroundColor: ink, borderColor: ink } : { borderColor: t.faint },
          ]}
        />
      ))}
      {count > target && <Text style={[type.meta, { color: ink, fontWeight: '700' }]}>+{count - target}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  slot: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stamp: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  punches: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  punch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
