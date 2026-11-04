import { View } from 'react-native';

import { Text } from '@shared/components';

/** A step's heading and line: "When and where?" / "Set the date, time and meeting point…". */
export function StepIntro({ heading, body }: { heading: string; body: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="headingMd" accessibilityRole="header">
        {heading}
      </Text>
      <Text variant="bodySm" tone="muted">
        {body}
      </Text>
    </View>
  );
}
