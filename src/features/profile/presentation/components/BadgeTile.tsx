import { TouchableOpacity, View } from 'react-native';

import { Tag, Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { BadgeProgress } from '../../domain/rules/achievementRules';
import { profileViewCopy } from '../profileViewCopy';
import { BadgeArt } from './BadgeArt';
import { Meter } from './Meter';

/**
 * A badge in the Achievements grid: the art, its name, "3/3 completed", and an
 * "Earned" tag — or, still in progress, a Marigold bar. Opens the badge sheet.
 */
export function BadgeTile({ progress, onPress }: { progress: BadgeProgress; onPress: () => void }) {
  const theme = useTheme();
  const { badge, done, earned } = progress;
  const completed = profileViewCopy.badges.completed(done, badge.target);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.name}, ${earned ? profileViewCopy.badges.earned : completed}`}
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        paddingVertical: 20,
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <BadgeArt look={badge.look} size={68} locked={!earned} />
      <Text variant="headingSm" className="text-center">
        {badge.name}
      </Text>
      <Text variant="bodySm" tone="muted">
        {completed}
      </Text>
      <View style={{ alignSelf: 'stretch', alignItems: 'center', marginTop: 4 }}>
        {earned ? (
          <Tag label={`✓ ${profileViewCopy.badges.earned}`} tone="success" />
        ) : (
          <View style={{ alignSelf: 'stretch' }}>
            <Meter value={done / badge.target} label={completed} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
