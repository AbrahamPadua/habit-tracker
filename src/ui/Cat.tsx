import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from './theme';

export type CatPose = 'sit' | 'sleep' | 'peek' | 'groom';

/** Tommy Boy's coat, the same in both themes: a black and white tuxedo cat either way. */
export const TUX = {
  fur: '#26272E',
  furFar: '#3D3F48',
  white: '#F7F5F0',
  whiteFar: '#D8D6D0',
  nose: '#EFB2BB',
  innerEar: '#6E555C',
  tuft: '#E6E3DC',
  eye: '#BCC86E',
  pupil: '#141519',
  whisker: '#D9DBE0',
  shut: '#9AA0AE',
  mouth: '#5D6170',
  toe: '#B9B6AF',
  bean: '#E39AA8',
  tongue: '#E0798C',
  silver: '#C5C9D0',
  silverEdge: '#7E838D',
};

/** Props for an open, round-ended stroke. */
export const stroked = (color: string, width: number) =>
  ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' }) as const;

/** A filled patch of fur with the cat's outline. */
export function Fur({ d, rim, fill = TUX.fur }: { d: string; rim: string; fill?: string }) {
  return <Path d={d} fill={fill} stroke={rim} strokeWidth={1.2} strokeLinejoin="round" />;
}

/** A tail or leg: a thick round stroke over a slightly wider outline. */
export function Limb({ d, rim, width, color = TUX.fur }: { d: string; rim: string; width: number; color?: string }) {
  return (
    <>
      <Path d={d} {...stroked(rim, width + 2)} />
      <Path d={d} {...stroked(color, width)} />
    </>
  );
}

/** His silver collar, along the path `d`. */
export function Collar({ d }: { d: string }) {
  return (
    <>
      <Path d={d} {...stroked(TUX.silverEdge, 3.4)} />
      <Path d={d} {...stroked(TUX.silver, 2.2)} />
    </>
  );
}

/** His bone-shaped name tag on a little ring, centred on (x, y). */
export function Tag({ x, y }: { x: number; y: number }) {
  const ends = [
    [x - 2.3, y - 0.75],
    [x - 2.3, y + 0.75],
    [x + 2.3, y - 0.75],
    [x + 2.3, y + 0.75],
  ];
  return (
    <>
      <Circle cx={x} cy={y - 2.4} r={0.85} fill="none" stroke={TUX.silver} strokeWidth={0.6} />
      {ends.map(([ex, ey]) => (
        <Circle key={`rim${ex},${ey}`} cx={ex} cy={ey} r={1.05} fill={TUX.silver} stroke={TUX.silverEdge} strokeWidth={0.35} />
      ))}
      <Path d={`M${x - 2.3} ${y - 0.75} h4.6 v1.5 h-4.6 Z`} fill={TUX.silver} />
      {ends.map(([ex, ey]) => (
        <Circle key={`fill${ex},${ey}`} cx={ex} cy={ey} r={0.75} fill={TUX.silver} />
      ))}
    </>
  );
}

/** A white foot sole facing us, with a big pad and four toe beans. */
function Sole({ x, y, rx, ry, rim }: { x: number; y: number; rx: number; ry: number; rim: string }) {
  return (
    <>
      <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill={TUX.white} stroke={rim} strokeWidth={1.1} />
      <Ellipse cx={x} cy={y + ry * 0.28} rx={rx * 0.42} ry={ry * 0.32} fill={TUX.bean} />
      {[-0.62, -0.22, 0.22, 0.62].map((k, i) => (
        <Circle key={k} cx={x + k * rx * 1.05} cy={y - ry * (i === 0 || i === 3 ? 0.22 : 0.48)} r={rx * 0.19} fill={TUX.bean} />
      ))}
    </>
  );
}

/** False while Reduce Motion is on, so the cat holds still. */
export function useMotion() {
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => setMoving(!reduce));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduce) => setMoving(!reduce));
    return () => sub.remove();
  }, []);
  return moving;
}

/**
 * The cat, drawn after Tommy Boy: a tuxedo cat with a silver collar and a bone-shaped tag, in one pose.
 * He blinks and swishes his tail while sitting, breathes while asleep, and bobs his head while grooming.
 * Purely decorative: hidden from screen readers, never touchable, and still when Reduce Motion is on.
 */
export function Cat({ pose, size = 40 }: { pose: CatPose; size?: number }) {
  const t = useTheme();
  const rim = t.catRim;
  const moving = useMotion();
  const [blink, setBlink] = useState(false);
  const [tail] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));

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

  // Grooming: his head bobs between two frames, down with the tongue out, then up.
  const [lickDown, setLickDown] = useState(false);
  useEffect(() => {
    if (!moving || pose !== 'groom') return;
    const lick = setInterval(() => setLickDown((d) => !d), 230);
    return () => clearInterval(lick);
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
            // The tail swings from where it leaves the body.
            transformOrigin: '64% 89%',
            transform: [{ rotate: tail.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-16deg'] }) }],
          }}
        >
          <Svg width={size} height={size} viewBox="0 0 64 64">
            <Limb d="M41 57 C53 58 58 49 55 40" rim={rim} width={4.2} />
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
              <Fur rim={rim} d="M19 59.5 C15.5 50 20 37.5 32 37 C44 37.5 48.5 50 45 59.5 Z" />
              <Path d="M32 38 C26.5 41 25 48 26.6 54 C28 57.5 36 57.5 37.4 54 C39 48 37.5 41 32 38 Z" fill={TUX.white} />
              <Ellipse cx={26.8} cy={58.6} rx={4.5} ry={2.9} fill={TUX.white} stroke={rim} strokeWidth={1.1} />
              <Ellipse cx={37.2} cy={58.6} rx={4.5} ry={2.9} fill={TUX.white} stroke={rim} strokeWidth={1.1} />
              <Face cx={32} cy={23.5} rim={rim} shut={blink} />
              <Collar d="M23.5 36.4 Q32 41.2 40.5 36.4" />
              <Tag x={32} y={43.2} />
            </>
          )}
          {pose === 'groom' && (
            <>
              <Limb d="M24 59 C13 61 7.5 55 9.5 48" rim={rim} width={4.2} />
              {/* The raised hind leg, straight up beside his head: white sock and toe beans in the air. */}
              <Limb d="M43 55 C49 46 53 32 54.5 17" rim={rim} width={6.2} />
              <Limb d="M53.4 29 C54 24 54.3 20.5 54.5 17" rim={rim} width={5.2} color={TUX.white} />
              <Sole x={55} y={12.6} rx={4.4} ry={4.8} rim={rim} />
              <Fur rim={rim} d="M20 59 C17 48 21 37 32 36.5 C42 37 46.5 46 45.5 55 C45 59 40 60.5 33 60.5 C26 60.5 21 60.5 20 59 Z" />
              <Path d="M26.5 45 C25 51 27.5 57.5 32.5 58 C37.5 57.5 39.5 51 38 45.5 C36 40.5 28.5 40.5 26.5 45 Z" fill={TUX.white} />
              {/* The other hind leg splayed toward us, sole up. */}
              <Fur rim={rim} d="M28 50 C20.5 49 14 53 13 57.5 C12.5 60.5 16.5 61.5 20.5 60.5 L29 58 Z" />
              <Sole x={13.4} y={57.4} rx={4.6} ry={3.8} rim={rim} />
              <Limb d="M27.5 42 L24.5 56.5" rim={rim} width={4.4} />
              <Ellipse cx={24.2} cy={58.2} rx={3.4} ry={2.2} fill={TUX.white} stroke={rim} strokeWidth={1.1} />
              <Collar d="M28 41.5 Q35 45.5 42 41" />
              {/* Head bowed toward the raised leg, bobbing between two frames: down with the tongue out, then up. */}
              <G rotation={lickDown ? 36 : 26} origin="31, 40">
                <G scale={0.86} origin="31, 30">
                  <Face cx={31} cy={30} rim={rim} shut tongue={lickDown} />
                </G>
              </G>
            </>
          )}
          {pose === 'peek' && (
            <>
              <Fur rim={rim} d="M18 64 C18 55.5 24 51 32 51 C40 51 46 55.5 46 64 Z" />
              <Path d="M32 52 C28 54 27 59 28 64 L36 64 C37 59 36 54 32 52 Z" fill={TUX.white} />
              <Face cx={32} cy={38} rim={rim} shut={blink} />
              <Collar d="M24 50.6 Q32 55 40 50.6" />
              <Tag x={32} y={56.6} />
              <Ellipse cx={21} cy={57} rx={6} ry={3.8} fill={TUX.white} stroke={rim} strokeWidth={1.1} />
              <Ellipse cx={43} cy={57} rx={6} ry={3.8} fill={TUX.white} stroke={rim} strokeWidth={1.1} />
              <Path d="M19 57.7 v1.6 M21.3 57.9 v1.6 M41 57.7 v1.6 M43.3 57.9 v1.6" {...stroked(TUX.toe, 0.8)} />
            </>
          )}
          {pose === 'sleep' && (
            <>
              <Ellipse cx={35} cy={47} rx={21} ry={11.5} fill={TUX.fur} stroke={rim} strokeWidth={1.2} />
              <Limb d="M54 50 C61 58 31 63.5 17 57" rim={rim} width={4.2} />
              <Ellipse cx={26.5} cy={56} rx={5.2} ry={2.9} fill={TUX.white} stroke={rim} strokeWidth={1.1} />
              <Fur rim={rim} d="M10.5 41.5 L9.6 30.8 Q10.1 29.7 11.4 30.5 L17.8 35.8 Z" />
              <Path d="M11.6 38.6 L11.2 33.2 L15.3 36 Z" fill={TUX.innerEar} />
              <Fur rim={rim} d="M21 35.2 L26.6 28.8 Q27.7 28.4 28 29.6 L28.4 38.8 Z" />
              <Path d="M22.8 35.6 L26.4 31.5 L26.6 37 Z" fill={TUX.innerEar} />
              <Ellipse cx={19} cy={45.2} rx={11} ry={10.2} fill={TUX.fur} stroke={rim} strokeWidth={1.2} />
              <Path
                d="M17.4 35.3 C17.6 38 18 40 17.4 42 C15.8 44 13.4 46.4 13.5 49 C13.8 52.4 16.6 54 19.6 54 C23.2 53.8 25.4 51.4 24.8 48.6 C24.2 46 21.4 44 19.9 42 C19.5 40 19.5 37.6 19.7 35.2 Z"
                fill={TUX.white}
              />
              <Path d="M11.8 44.6 q2.3 1.8 4.6 0 M21.6 44.6 q2.3 1.8 4.6 0" {...stroked(TUX.shut, 1.2)} />
              <Path d="M17.4 47.9 L20.6 47.9 L19 49.9 Z" fill={TUX.nose} stroke={TUX.nose} strokeWidth={0.8} strokeLinejoin="round" />
              <Collar d="M11 52.6 Q19 58 27 52.6" />
              <Tag x={19.6} y={58.4} />
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

/** Tommy's head, centred on (cx, cy): ears with white tufts, cheek fur, his off-centre blaze, eyes, nose and whiskers. */
function Face({ cx, cy, rim, shut, tongue = false }: { cx: number; cy: number; rim: string; shut: boolean; tongue?: boolean }) {
  const p = (dx: number, dy: number) => `${cx + dx} ${cy + dy}`;
  const ear = (s: number) => (
    <>
      <Fur rim={rim} d={`M${p(s * -12.5, -5)} L${p(s * -12.2, -17.5)} Q${p(s * -11.2, -18.8)} ${p(s * -9.8, -17.6)} L${p(s * -2, -11.5)} Z`} />
      <Path d={`M${p(s * -10.6, -7.5)} L${p(s * -10.3, -14.6)} L${p(s * -5, -10.8)} Z`} fill={TUX.innerEar} />
      <Path d={`M${p(s * -9.6, -8.6)} L${p(s * -8.6, -12.6)} M${p(s * -7.8, -9.2)} L${p(s * -7.5, -12)}`} {...stroked(TUX.tuft, 0.55)} />
    </>
  );
  const eye = (x: number) => (
    <>
      <Ellipse cx={x} cy={cy - 1} rx={3.1} ry={3.3} fill={TUX.eye} />
      <Ellipse cx={x} cy={cy - 0.8} rx={1.1} ry={2.5} fill={TUX.pupil} />
      <Circle cx={x + 1} cy={cy - 2.3} r={0.8} fill="#FFFFFF" />
    </>
  );
  return (
    <>
      {ear(1)}
      {ear(-1)}
      <Fur
        rim={rim}
        d={
          `M${p(-13.5, -4)} C${p(-14.5, -12)} ${p(-7, -13.5)} ${p(0, -13.5)} C${p(7, -13.5)} ${p(14.5, -12)} ${p(13.5, -4)} ` +
          `C${p(15.2, 0.5)} ${p(15, 4.5)} ${p(14, 6.8)} L${p(16, 8.4)} L${p(12.8, 9.2)} ` +
          `C${p(9.5, 13.2)} ${p(4.5, 13.8)} ${p(0, 13.8)} C${p(-4.5, 13.8)} ${p(-9.5, 13.2)} ${p(-12.8, 9.2)} ` +
          `L${p(-16, 8.4)} L${p(-14, 6.8)} C${p(-15, 4.5)} ${p(-15.2, 0.5)} ${p(-13.5, -4)} Z`
        }
      />
      {/* His blaze: a narrow stripe from the top of the head, a little left of centre, opening into a white muzzle. */}
      <Path
        d={
          `M${p(-2.6, -13.4)} C${p(-2.5, -10)} ${p(-1.8, -6.5)} ${p(-2.4, -3.2)} C${p(-4.2, 0)} ${p(-8.2, 3.2)} ${p(-8, 6.8)} ` +
          `C${p(-7.6, 11)} ${p(-3.5, 12.8)} ${p(0.5, 12.6)} C${p(5, 12.3)} ${p(7.6, 9.6)} ${p(7.2, 6.4)} ` +
          `C${p(6.8, 3.6)} ${p(3, 0.6)} ${p(1.2, -2.6)} C${p(0.6, -6)} ${p(0.5, -10)} ${p(0.3, -13.5)} Z`
        }
        fill={TUX.white}
      />
      {shut ? (
        <Path d={`M${p(-9, -0.6)} q2.8 1.7 5.6 0 M${p(3.4, -0.6)} q2.8 1.7 5.6 0`} {...stroked(TUX.shut, 1.2)} />
      ) : (
        <>
          {eye(cx - 6.2)}
          {eye(cx + 6.2)}
        </>
      )}
      {tongue && <Path d={`M${p(-2.2, 7.4)} q2.2 6.4 4.4 0 Z`} fill={TUX.tongue} />}
      <Path d={`M${p(-2, 4.4)} L${p(2, 4.4)} L${p(0, 6.8)} Z`} fill={TUX.nose} stroke={TUX.nose} strokeWidth={0.9} strokeLinejoin="round" />
      <Path d={`M${p(0, 6.8)} q-1.4 1.8 -3 0.8 M${p(0, 6.8)} q1.4 1.8 3 0.8`} {...stroked(TUX.mouth, 0.9)} />
      <Path
        d={
          `M${p(-7, 6)} L${p(-19.5, 4)} M${p(-7, 7.6)} L${p(-19, 8.8)} M${p(-6.6, 9)} L${p(-17.5, 12.4)} ` +
          `M${p(7, 6)} L${p(19.5, 4)} M${p(7, 7.6)} L${p(19, 8.8)} M${p(6.6, 9)} L${p(17.5, 12.4)}`
        }
        {...stroked(TUX.whisker, 0.6)}
      />
    </>
  );
}
