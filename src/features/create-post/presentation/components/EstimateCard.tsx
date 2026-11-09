import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

/**
 * The price as travellers will read it ("PRICE / ₦5,000 per person"): a caps
 * label, the amount large in teal, and a line on where it shows. Only drawn
 * once a price is typed. The amount fades as it changes.
 */
export function EstimateCard({ label, amount, body }: { label: string; amount: string; body: string }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      accessible
      accessibilityLabel={`${label}. ${amount}. ${body}`}
      style={{ borderRadius: 16, padding: 20, backgroundColor: theme.surfaceMuted, gap: 6 }}
    >
      <Text variant="labelXs" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Animated.View key={amount} entering={FadeIn.duration(150)}>
        <Text variant="headingLg" tone="primary">
          {amount}
        </Text>
      </Animated.View>
      <Text variant="bodySm" tone="muted">
        {body}
      </Text>
    </Animated.View>
  );
}
