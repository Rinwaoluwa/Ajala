import { View } from 'react-native';

import { Text } from '@shared/components';

/**
 * The heading and lead paragraph at the top of each sign-up screen: Plus Jakarta
 * 32/40 in the heading colour, then Inter 16/24, 8pt apart.
 */

export type AuthIntroProps = {
  title: string;
  body: string;
};

export function AuthIntro({ title, body }: AuthIntroProps) {
  return (
    <View>
      <Text variant="headingXxl" tone="heading" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodyMd" className="mt-8">
        {body}
      </Text>
    </View>
  );
}
