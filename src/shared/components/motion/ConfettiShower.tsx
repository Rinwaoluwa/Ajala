import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette } from '@shared/theme';

/**
 * Confetti fired from both bottom corners of the screen: paper pieces in the
 * brand colours shoot up and in, slow as they peak, then flutter down, turning
 * and flipping like paper, and fade out. One run of `DURATION_MS`, started
 * whenever `fire` changes to a new number.
 *
 * Runs on the UI thread (Reanimated): one shared clock, and each piece works
 * out where it is from its own launch speed, gravity and spin, so the JS thread
 * is free the whole time. It takes no touches.
 */

const DURATION_MS = 2600;
const PIECES = 70;
/** Points per second squared, in the clock's 0-1 units scaled by the duration. */
const GRAVITY = 1500;

const COLORS = [
  palette.teal,
  palette.marigold,
  palette.coral,
  '#5C5CF6',
  palette.success,
  '#7FD9CE',
  '#FFD98A',
] as const;

type Piece = {
  fromLeft: boolean;
  color: string;
  width: number;
  height: number;
  round: boolean;
  /** Launch speed, points per second. */
  vx: number;
  vy: number;
  spin: number;
  flutter: number;
  sway: number;
  delay: number;
};

/** Repeatable randomness per piece, so pieces don't change between renders. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function makePieces(height: number): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const r = (salt: number) => seeded(i, salt);
    const fromLeft = i % 2 === 0;
    // Up and in, steep enough to reach the top third of the screen.
    const speed = Math.sqrt(2 * GRAVITY * height * (0.55 + 0.35 * r(1)));
    const angle = (62 + 22 * r(2)) * (Math.PI / 180);
    const round = r(3) > 0.75;
    const size = 7 + 5 * r(4);
    return {
      fromLeft,
      color: COLORS[Math.floor(r(5) * COLORS.length)] ?? palette.teal,
      width: round ? size : size * 0.7,
      height: round ? size : size * 1.6,
      round,
      vx: Math.cos(angle) * speed * (0.45 + 0.4 * r(6)),
      vy: -Math.sin(angle) * speed,
      spin: (r(7) - 0.5) * 900,
      flutter: 6 + 8 * r(8),
      sway: 12 + 18 * r(9),
      delay: 0.08 * r(10),
    };
  });
}

export const ConfettiShower = memo(function ConfettiShower({ fire }: { fire: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(height), [height]);
  const clock = useSharedValue(0);

  useEffect(() => {
    if (fire <= 0) return;
    clock.set(0);
    clock.set(withTiming(1, { duration: DURATION_MS, easing: Easing.linear }));
  }, [fire, clock]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} clock={clock} width={width} height={height} />
      ))}
    </View>
  );
});

function ConfettiPiece({
  piece,
  clock,
  width,
  height,
}: {
  piece: Piece;
  clock: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, clock.value - piece.delay) * (DURATION_MS / 1000);
    if (clock.value <= piece.delay || clock.value >= 1) return { opacity: 0 };
    // Air drag: sideways speed bleeds off, so pieces drift rather than fly off screen.
    const drag = 1 - Math.exp(-1.6 * t);
    const dx = (piece.vx / 1.6) * drag + Math.sin(t * 3.2) * piece.sway * Math.min(1, t);
    const dy = piece.vy * t + 0.5 * GRAVITY * t * t;
    // Paper falls slower than it rises: cap the downward speed.
    const fall = Math.max(0, piece.vy + GRAVITY * t);
    const capped = fall > 260 ? dy - ((fall - 260) * (fall - 260)) / (2 * GRAVITY) : dy;
    const x = piece.fromLeft ? dx : width - dx;
    const life = clock.value;
    return {
      opacity: life > 0.78 ? (1 - life) / 0.22 : 1,
      transform: [
        { translateX: x - piece.width / 2 },
        { translateY: height + capped },
        { rotate: `${piece.spin * t}deg` },
        { scaleY: Math.cos(t * piece.flutter) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: piece.width,
          height: piece.height,
          borderRadius: piece.round ? piece.width / 2 : 1.5,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}
