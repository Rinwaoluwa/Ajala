import { View } from 'react-native';

import { Button, Sheet, Text } from '@shared/components';
import { palette } from '@shared/theme';

import { chatCopy } from '../copy';

/**
 * "Safety tips" (Figma Chat, bottom sheet): a line, five numbered tips with mint
 * number circles, and "Got it". The shared `Sheet` brings the handle, the ×,
 * the scrim and the rise.
 */
export function SafetyTipsSheet({ isPresented, onDismiss }: { isPresented: boolean; onDismiss: () => void }) {
  const t = chatCopy.tips;
  return (
    <Sheet isPresented={isPresented} title={t.title} subtitle={t.body} onDismiss={onDismiss}>
      <View style={{ gap: 20 }}>
        {t.items.map((tip, i) => (
          <View key={tip.title} style={{ flexDirection: 'row', gap: 16 }} accessible>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#E6FAF7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="labelSm" maxFontSizeMultiplier={1.3} style={{ color: palette.ink }}>
                {i + 1}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyMd">{tip.title}</Text>
              <Text variant="bodySm" tone="muted">
                {tip.body}
              </Text>
            </View>
          </View>
        ))}
        <Button label={t.action} size="lg" fullWidth onPress={onDismiss} />
      </View>
    </Sheet>
  );
}
