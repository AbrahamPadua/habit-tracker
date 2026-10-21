import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from './theme';

export type CatPose = 'sit' | 'sleep' | 'peek';

/**
 * The card cat: an ink line drawing that lives on each person's card, with a collar in their stamp ink.
 * Sits and blinks while there is something left, naps once the day is stamped, peeks in on an empty card.
 * Purely decorative: hidden from screen readers, never touchable, and still when Reduce Motion is on.
 */
export function Cat({ pose, ink, size = 40 }: { pose: CatPose; ink: string; size?: number }) {
  const t = useTheme();
  const [moving, setMoving] = useState(false);
  const [blink, setBlink] = useState(false);
  const [tail] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => setMoving(!reduce));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduce) => setMoving(!reduce));
    return () => sub.remove();
  }, []);

  // A blink every few seconds, at uneven intervals so it reads as alive rather than as a metronome.
  useEffect(() => {
    if (!moving || pose === 'sleep') return;
    let next: ReturnType<typeof setTimeout>;
    let open: ReturnType<typeof setTimeout>;
    const schedule = () => {
      next = setTimeout(() => {
        setBlink(true);
        open = setTimeout(() => setBlink(false), 140);
        schedule();
      }, 2800 + Math.random() * 3500);
    };
    schedule();
    return () => {
      clearTimeout(next);
      clearTimeout(open);
    };
  }, [moving, pose]);

  useEffect(() => {
    if (!moving) return;
    const swish = (v: Animated.Value, ms: number, rest: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.delay(rest),
        ]),
      );
    const loop = pose === 'sleep' ? swish(breath, 1800, 300) : pose === 'sit' ? swish(tail, 700, 2600) : null;
    loop?.start();
    return () => {
      loop?.stop();
      // A stopped loop freezes mid-swish; settle so the next pose (or Reduce Motion) starts straight.
      tail.setValue(0);
      breath.setValue(0);
    };
  }, [moving, pose, tail, breath]);

  const line = { stroke: t.ink, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const fill = t.card;

  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pose === 'sit' && (
        <Animated.View
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: '69% 88%',
            transform: [{ rotate: tail.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-16deg'] }) }],
          }}
        >
          <Svg width={size} height={size} viewBox="0 0 64 64">
            <Path d="M44 57 C56 57 59 45 54 37" fill="none" {...line} strokeWidth={3} />
          </Svg>
        </Animated.View>
      )}

      <Animated.View
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '50% 100%',
          transform: [{ scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          {pose === 'sit' && (
            <>
              <Path d="M20 58 C18 46 22 36 32 36 C42 36 46 46 44 58 Z" fill={fill} {...line} />
              <Ellipse cx={27} cy={58} rx={4.2} ry={2.6} fill={fill} {...line} strokeWidth={2} />
              <Ellipse cx={37} cy={58} rx={4.2} ry={2.6} fill={fill} {...line} strokeWidth={2} />
              <Face cx={32} cy={25} line={line} fill={fill} ink={ink} blink={blink} />
              <Path d="M23 36 Q32 41.5 41 36" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
            </>
          )}
          {pose === 'peek' && (
            <>
              <Face cx={32} cy={38} line={line} fill={fill} ink={ink} blink={blink} />
              <Ellipse cx={23} cy={53} rx={5.5} ry={3.6} fill={fill} {...line} strokeWidth={2} />
              <Ellipse cx={41} cy={53} rx={5.5} ry={3.6} fill={fill} {...line} strokeWidth={2} />
            </>
          )}
          {pose === 'sleep' && (
            <>
              <Path d="M50 52 C58 60 28 62 18 55" fill="none" {...line} strokeWidth={3} />
              <Ellipse cx={34} cy={47} rx={21} ry={11} fill={fill} {...line} />
              <Path d="M11 41 L10 31 L17 36 Z" fill={fill} {...line} strokeWidth={2} />
              <Path d="M22 36 L27 29 L28 38 Z" fill={fill} {...line} strokeWidth={2} />
              <Circle cx={19} cy={44} r={10} fill={fill} {...line} />
              <Path d="M13 44 q2 2 4 0 M20 44 q2 2 4 0" fill="none" {...line} strokeWidth={1.6} />
              <Path d="M17.6 47.5 l1.4 0 l-0.7 1.1 Z" fill={ink} />
              <Path d="M26 50 q3 3 7 1" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
              <SvgText x={42} y={30} fontSize={9} fontWeight="700" fill={t.muted}>
                z
              </SvgText>
              <SvgText x={49} y={22} fontSize={12} fontWeight="700" fill={t.muted}>
                z
              </SvgText>
            </>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

type Line = { stroke: string; strokeWidth: number; strokeLinecap: 'round'; strokeLinejoin: 'round' };

/** Ears, head, eyes, nose, mouth and whiskers, centred on (cx, cy). */
function Face({ cx, cy, line, fill, ink, blink }: { cx: number; cy: number; line: Line; fill: string; ink: string; blink: boolean }) {
  const p = (dx: number, dy: number) => `${cx + dx} ${cy + dy}`;
  return (
    <>
      <Path d={`M${p(-11, -6)} L${p(-10, -17)} L${p(-3, -10)} Z`} fill={fill} {...line} strokeWidth={2} />
      <Path d={`M${p(11, -6)} L${p(10, -17)} L${p(3, -10)} Z`} fill={fill} {...line} strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={13} fill={fill} {...line} />
      {blink ? (
        <Path d={`M${p(-7, 0)} h4 M${p(3, 0)} h4`} fill="none" {...line} strokeWidth={1.8} />
      ) : (
        <>
          <Ellipse cx={cx - 5} cy={cy} rx={1.8} ry={2.5} fill={line.stroke} />
          <Ellipse cx={cx + 5} cy={cy} rx={1.8} ry={2.5} fill={line.stroke} />
        </>
      )}
      <Path d={`M${p(-1.2, 4)} L${p(1.2, 4)} L${p(0, 5.5)} Z`} fill={ink} />
      <Path d={`M${p(0, 5.5)} q-1.6 2 -3.2 0.6 M${p(0, 5.5)} q1.6 2 3.2 0.6`} fill="none" {...line} strokeWidth={1.2} />
      <Path
        d={`M${p(-8, 4)} L${p(-15, 3)} M${p(-8, 6)} L${p(-15, 7)} M${p(8, 4)} L${p(15, 3)} M${p(8, 6)} L${p(15, 7)}`}
        fill="none"
        {...line}
        strokeWidth={1}
      />
    </>
  );
}
