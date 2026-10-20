import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import type { DateKey } from '../domain/types';
import { catPath } from './catPath';
import { useTheme } from './theme';

/** Rendered size of the side-view cat; the drawing uses a 80x56 viewBox. */
export const WALKER = { w: 60, h: 42 };

type Frame = 'stepA' | 'stand' | 'stepB' | 'leap';

/** The card cat seen from the side, facing right, in one of its walk frames. */
function SideCat({ frame, ink }: { frame: Frame; ink: string }) {
  const t = useTheme();
  const line = { stroke: t.ink, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  // How far each foot swings from under its hip: [near front + far hind, far front + near hind].
  const [a, b] = { stepA: [6, -4], stand: [0, 0], stepB: [-4, 6], leap: [10, -10] }[frame];
  const footY = frame === 'leap' ? 44 : 50;
  const leg = (hip: number, dx: number, far: boolean) => (
    <Line key={`${hip}`} x1={hip} y1={35} x2={hip + dx} y2={footY} {...line} stroke={far ? t.muted : t.ink} />
  );
  return (
    <Svg width={WALKER.w} height={WALKER.h} viewBox="0 0 80 56">
      {leg(46, b, true)}
      {leg(23, a, true)}
      <Path d="M19 28 C9 26 7 15 12 8" fill="none" {...line} strokeWidth={3} />
      <Ellipse cx={37} cy={31} rx={19} ry={10.5} fill={t.card} {...line} />
      {leg(50, a, false)}
      {leg(27, b, false)}
      <Path d="M53 16 L54 6 L59 13 Z" fill={t.card} {...line} strokeWidth={2} />
      <Path d="M61 13 L66 5 L68 16 Z" fill={t.card} {...line} strokeWidth={2} />
      <Circle cx={60} cy={22} r={10} fill={t.card} {...line} />
      <Ellipse cx={64} cy={21} rx={1.6} ry={2.2} fill={t.ink} />
      <Path d="M69.4 24 l1.8 0.3 l-1.1 1.3 Z" fill={ink} />
      <Path d="M70 25.6 q-1.6 1.8 -3.4 0.8" fill="none" {...line} strokeWidth={1.2} />
      <Path d="M66 25 L76 24 M66 27 L76 28.5" fill="none" {...line} strokeWidth={1} />
      <Path d="M52 26.5 Q55.5 31 53 35.5" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

const FLOOR_MS = 900;
const CROUCH_MS = 120;
const JUMP_MS = 600;
const LAND_MS = 200;
const PX_PER_MS = 0.2;

/**
 * The cat's daily entrance: it walks in along the floor, crouches, leaps onto the top of the card,
 * turns, and walks along the card to its spot. Positions are in the parent overlay's coordinates;
 * taps pass straight through.
 */
export function CatEntrance({
  floorY,
  width,
  to,
  ink,
  onDone,
}: {
  floorY: number;
  width: number;
  to: { x: number; y: number; w: number; h: number };
  ink: string;
  onDone: () => void;
}) {
  // Lazy state, not refs: the values are created once and never read during render through `.current`.
  const [x] = useState(() => new Animated.Value(-WALKER.w));
  const [hop] = useState(() => new Animated.Value(0));
  const [squash] = useState(() => new Animated.Value(1));
  const [frame, setFrame] = useState<Frame>('stand');
  const [facing, setFacing] = useState(1);

  const { takeoffX, landX, spotX, floor, peak, cardY } = catPath(floorY, width, to, WALKER);
  const backMs = Math.max(300, (landX - spotX) / PX_PER_MS);

  useEffect(() => {
    const steps: Frame[] = ['stepA', 'stand', 'stepB', 'stand'];
    let i = 0;
    let walk: ReturnType<typeof setInterval> | undefined;
    const startWalking = () => {
      walk = setInterval(() => setFrame(steps[i++ % steps.length]), 110);
    };
    const stopWalking = (next: Frame) => {
      clearInterval(walk);
      setFrame(next);
    };
    const jumpAt = FLOOR_MS + CROUCH_MS;
    const landAt = jumpAt + JUMP_MS;
    const turnAt = landAt + LAND_MS;
    startWalking();
    const timers = [
      setTimeout(() => stopWalking('stand'), FLOOR_MS),
      setTimeout(() => setFrame('leap'), jumpAt),
      setTimeout(() => setFrame('stand'), landAt),
      setTimeout(() => {
        setFacing(-1);
        startWalking();
      }, turnAt),
      setTimeout(() => stopWalking('stand'), turnAt + backMs),
    ];
    const run = Animated.sequence([
      Animated.timing(x, { toValue: takeoffX, duration: FLOOR_MS, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(squash, { toValue: 0.86, duration: CROUCH_MS, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(squash, { toValue: 1, duration: CROUCH_MS, useNativeDriver: true }),
        Animated.timing(x, { toValue: landX, duration: JUMP_MS, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(hop, { toValue: 1, duration: JUMP_MS, easing: Easing.linear, useNativeDriver: true }),
      ]),
      Animated.timing(squash, { toValue: 0.88, duration: LAND_MS / 2, useNativeDriver: true }),
      Animated.timing(squash, { toValue: 1, duration: LAND_MS / 2, useNativeDriver: true }),
      Animated.timing(x, { toValue: spotX, duration: backMs, easing: Easing.linear, useNativeDriver: true }),
    ]);
    run.start(({ finished }) => finished && onDone());
    return () => {
      clearInterval(walk);
      timers.forEach(clearTimeout);
      run.stop();
    };
    // The entrance plays once from where it was measured; later layout changes don't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Most of the leap is the climb; it clears the card edge, then drops the last bit onto it.
  const climb = floor - peak;
  const y = hop.interpolate({
    inputRange: [0, 0.3, 0.6, 0.8, 1],
    outputRange: [floor, floor - climb * 0.7, peak, peak + (cardY - peak) * 0.55, cardY],
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transformOrigin: '50% 100%',
        transform: [{ translateX: x }, { translateY: y }, { scaleY: squash }],
      }}
    >
      <View style={{ transform: [{ scaleX: facing }] }}>
        <SideCat frame={frame} ink={ink} />
      </View>
    </Animated.View>
  );
}

const WALKED_KEY = 'ourspace.catWalkedOn';

/**
 * Whether today's walk-in should play: once per day on this phone, never with Reduce Motion.
 * `start` records the day as soon as the walk begins, so leaving mid-walk doesn't replay it.
 */
export function useDailyWalk(today: DateKey) {
  const [state, setState] = useState<'checking' | 'walk' | 'done'>('checking');
  useEffect(() => {
    let live = true;
    Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AsyncStorage.getItem(WALKED_KEY).catch(() => null)]).then(
      ([reduce, last]) => live && setState(!reduce && last !== today ? 'walk' : 'done'),
    );
    return () => {
      live = false;
    };
  }, [today]);
  const start = useCallback(() => {
    AsyncStorage.setItem(WALKED_KEY, today).catch(() => {});
  }, [today]);
  const finish = useCallback(() => setState('done'), []);
  return { state, start, finish };
}
