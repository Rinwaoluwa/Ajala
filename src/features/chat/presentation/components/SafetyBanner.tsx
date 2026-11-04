import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '@shared/components';
import { palette } from '@shared/theme';

import { chatCopy } from '../copy';

/**
 * "Keep chats on Ajala / Click here for safety tips" (Figma Chat): a mint card
 * under the header with a × that hides it on this phone. Mint in both schemes,
 * as drawn, so its text is ink and teal. Fades in and out (180ms).
 */
export function SafetyBanner({ onOpenTips, onClose }: { onOpenTips: () => void; onClose: () => void }) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        paddingVertical: 14,
        paddingLeft: 16,
        paddingRight: 12,
        backgroundColor: '#E6FAF7',
      }}
    >
      <Ionicons name="stopwatch-outline" size={24} color={palette.teal} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMd" style={{ color: palette.ink }}>
          {chatCopy.banner.title}
        </Text>
        <TouchableOpacity activeOpacity={0.6} onPress={onOpenTips} accessibilityRole="link" hitSlop={6}>
          <Text variant="bodySm" style={{ color: palette.teal, textDecorationLine: 'underline' }}>
            {chatCopy.banner.link}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={chatCopy.banner.close}
        style={{ alignSelf: 'flex-start' }}
      >
        <Ionicons name="close" size={20} color={palette.ink} />
      </TouchableOpacity>
    </Animated.View>
  );
}
