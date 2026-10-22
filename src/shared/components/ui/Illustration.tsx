import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { illustrations, type IllustrationData, type IllustrationName } from './illustrations.generated';

/**
 * Multi-colour art with a chosen and an unchosen look — the "Create something"
 * cards: in colour when chosen, grey otherwise. Both versions are generated
 * from the SVGs in `assets/icons` (`npm run icons`); `active` cross-fades
 * between them in 180ms.
 *
 * `width` sets the size; the height keeps the art's proportions.
 */
export function Illustration({
  name,
  width,
  active,
}: {
  name: IllustrationName;
  width: number;
  active: boolean;
}) {
  const art: IllustrationData = illustrations[name];
  const height = (width * art.height) / art.width;
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [active, on]);

  const colourStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const greyStyle = useAnimatedStyle(() => ({ opacity: 1 - on.value }));

  return (
    <View style={{ width, height }} accessible={false}>
      <Animated.View style={[{ position: 'absolute' }, greyStyle]}>
        <SvgXml xml={art.grey} width={width} height={height} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, colourStyle]}>
        <SvgXml xml={art.colour} width={width} height={height} />
      </Animated.View>
    </View>
  );
}

export type { IllustrationName };
