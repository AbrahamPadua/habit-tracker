import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import type { DateKey } from '../domain/types';
import { Collar, Fur, Limb, stroked, Tag, TUX } from './Cat';
import { catPath } from './catPath';
import { useTheme } from './theme';

/** Rendered size of the side-view cat; the drawing uses a 80x56 viewBox. */
export const WALKER = { w: 60, h: 42 };

type Frame = 'stepA' | 'stand' | 'stepB' | 'leap';

/** Tommy seen from the side, facing right, in one of his walk frames. */
function SideCat({ frame }: { frame: Frame }) {
  const rim = useTheme().catRim;
  // How far each foot swings from under its hip: [near front + far hind, far front + near hind].
  const [a, b] = { stepA: [6, -4], stand: [0, 0], stepB: [-4, 6], leap: [10, -10] }[frame];
  const footY = frame === 'leap' ? 44 : 50;
  // A black leg in a white sock: short on the front paws, up to the hock behind, like his.
  // The far legs are a shade dimmer for depth.
  const leg = (hip: number, dx: number, far: boolean, sockShare: number) => {
    const foot = `${hip + dx} ${footY - 1}`;
    const sock = `${hip + dx * (1 - sockShare)} ${33 + (footY - 33) * (1 - sockShare)}`;
    return (
      <>
        <Limb d={`M${hip} 31 L${foot}`} rim={rim} width={4.4} color={far ? TUX.furFar : TUX.fur} />
        <Limb d={`M${sock} L${foot} l1.2 0`} rim={rim} width={3.6} color={far ? TUX.whiteFar : TUX.white} />
      </>
    );
  };
  return (
    <Svg width={WALKER.w} height={WALKER.h} viewBox="0 0 80 56">
      {leg(47, b, true, 0.28)}
      {leg(24, a, true, 0.5)}
      <Limb d="M18.5 27 C8.5 25.5 6 15 10.5 8.5" rim={rim} width={3.2} />
      <Fur
        rim={rim}
        d="M17 30 C17 23.5 22 21 29 21.5 C36 22 42 23.5 47 22 C53 20.5 57.5 24 57.5 29.5 C57.5 35 53 38.5 46 38.5 C40 38.5 36 37.5 30 38.5 C22 39.5 17 36 17 30 Z"
      />
      <Path d="M44.5 37.8 C49.5 38.4 54.5 35.4 55.6 30 C56 27.4 55 25.6 53.6 25 C51.5 29.5 48.5 33.5 42.5 36 Z" fill={TUX.white} />
      {leg(51, a, false, 0.28)}
      {leg(28, b, false, 0.5)}
      <Fur rim={rim} fill={TUX.furFar} d="M52.6 16.5 L53.6 5.8 Q54.4 5 55.2 5.9 L59.6 12.6 Z" />
      <Fur rim={rim} d="M60.5 12.8 L65.8 4.8 Q66.8 4.4 67.2 5.4 L68.4 16 Z" />
      <Path d="M62.6 12.6 L66 7.6 L66.8 14.2 Z" fill={TUX.innerEar} />
      <Path d="M63.4 12.4 L65.4 8.8" {...stroked(TUX.tuft, 0.55)} />
      <Circle cx={60} cy={22} r={10.2} fill={TUX.fur} stroke={rim} strokeWidth={1.2} />
      <Path d="M61.6 23.4 C63.6 20.6 68 20.4 70.2 23.6 C71.4 26.8 69.2 30.6 64.6 31.2 C61 31.2 59.8 26.8 61.6 23.4 Z" fill={TUX.white} />
      <Ellipse cx={64.2} cy={19.6} rx={2} ry={2.4} fill={TUX.eye} />
      <Ellipse cx={64.6} cy={19.8} rx={0.8} ry={1.9} fill={TUX.pupil} />
      <Circle cx={65.2} cy={18.6} r={0.55} fill="#FFFFFF" />
      <Path d="M69.2 22.8 l2.2 0.3 l-1.4 1.6 Z" fill={TUX.nose} stroke={TUX.nose} strokeWidth={0.7} strokeLinejoin="round" />
      <Path d="M70 24.8 q-1.6 1.8 -3.4 0.8" {...stroked(TUX.mouth, 1)} />
      <Path d="M66 25.4 L79 23.4 M66 27.2 L78.5 29.6" {...stroked(TUX.whisker, 0.6)} />
      <Collar d="M52 26.5 Q55.5 31 53 35.5" />
      <Tag x={55.4} y={39.2} />
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
  onDone,
}: {
  floorY: number;
  width: number;
  to: { x: number; y: number; w: number; h: number };
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
        <SideCat frame={frame} />
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
