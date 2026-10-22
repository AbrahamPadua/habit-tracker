import { useEffect, useRef, useState, type RefObject } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Cat, useMotion, type CatPose } from './Cat';
import { SideCat, WALKER, type Frame } from './WalkingCat';

/** The resting cat's box; his feet sink a little into the card's top edge. */
export const PERCH = { size: 44, overlap: 3 };
// Keeps him clear of the card's rounded corners.
const EDGE = 12;
const STROLL_PX_PER_MS = 0.045;
const GROOM_MS = 3500;
const STEPS: Frame[] = ['stepA', 'stand', 'stepB', 'stand'];

export type Rest = Exclude<CatPose, 'groom'>;

/**
 * Tommy on top of my card. He rests in the pose the day calls for (sits while something is left, sleeps once
 * it's all stamped, peeks over the edge on an empty card), and every so often gets up and strolls along the
 * edge to a new spot, or plops down to wash. Taps pass through, and he holds still with Reduce Motion.
 */
export function CardCat({ rest, hidden, spotRef }: { rest: Rest; hidden: boolean; spotRef: RefObject<View | null> }) {
  const motion = useMotion();
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const at = useRef(0);
  const target = useRef(0);
  const [mode, setMode] = useState<'rest' | 'walk' | 'groom'>('rest');
  const [facing, setFacing] = useState(1);
  const [frame, setFrame] = useState<Frame>('stand');

  // Awake, a stroll or a wash about every half minute; asleep, a rare shuffle to a new spot.
  useEffect(() => {
    if (!motion || hidden || mode !== 'rest' || rest === 'peek' || !width) return;
    const wait = rest === 'sleep' ? 90_000 + Math.random() * 90_000 : 20_000 + Math.random() * 25_000;
    const timer = setTimeout(() => {
      if (rest === 'sit' && Math.random() < 0.4) return setMode('groom');
      const far = width - PERCH.size;
      let to = Math.random() * far;
      // Only worth getting up for at least a body length.
      if (Math.abs(to - at.current) < 48) to = at.current < far / 2 ? far : 0;
      target.current = to;
      setFacing(to > at.current ? 1 : -1);
      setMode('walk');
    }, wait);
    return () => clearTimeout(timer);
  }, [motion, hidden, mode, rest, width]);

  useEffect(() => {
    if (mode === 'groom') {
      const done = setTimeout(() => setMode('rest'), GROOM_MS);
      return () => clearTimeout(done);
    }
    if (mode !== 'walk') return;
    let i = 0;
    const legs = setInterval(() => setFrame(STEPS[i++ % STEPS.length]), 140);
    const to = target.current;
    const duration = Math.abs(to - at.current) / STROLL_PX_PER_MS;
    const run = Animated.timing(x, { toValue: to, duration, easing: Easing.linear, useNativeDriver: true });
    run.start(({ finished }) => {
      if (!finished) return;
      at.current = to;
      setMode('rest');
    });
    return () => {
      clearInterval(legs);
      run.stop();
    };
  }, [mode, x]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={styles.strip}
    >
      <Animated.View style={[styles.cat, { opacity: hidden ? 0 : 1, transform: [{ translateX: x }] }]}>
        {mode === 'walk' ? (
          // The walker is wider than the sitting cat; centre him on the same spot.
          <View style={{ marginLeft: (PERCH.size - WALKER.w) / 2, transform: [{ scaleX: facing }] }}>
            <SideCat frame={frame} />
          </View>
        ) : (
          <View ref={spotRef}>
            <Cat pose={mode === 'groom' ? 'groom' : rest} size={PERCH.size} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A strip along the card's top edge, inset from the rounded corners.
  strip: { position: 'absolute', left: EDGE, right: EDGE, top: PERCH.overlap - PERCH.size, height: PERCH.size },
  cat: { position: 'absolute', left: 0, bottom: 0 },
});
