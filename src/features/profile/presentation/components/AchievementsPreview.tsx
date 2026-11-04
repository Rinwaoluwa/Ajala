import { TouchableOpacity, View } from 'react-native';

import { Text, TextLink } from '@shared/components';

import type { BadgeProgress } from '../../domain/rules/achievementRules';
import { profileViewCopy } from '../profileViewCopy';
import { BadgeArt } from './BadgeArt';

/**
 * "Achievements · See all" on a profile: the count line and three badges side
 * by side — earned ones first, then the closest to earning. The three share the
 * width as flex cells, so they never wrap.
 */
export function AchievementsPreview({
  preview,
  earned,
  inProgress,
  onSeeAll,
  onOpenBadge,
}: {
  preview: BadgeProgress[];
  earned: number;
  inProgress: number;
  onSeeAll?: () => void;
  onOpenBadge?: (id: string) => void;
}) {
  const copy = profileViewCopy.achievements;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="headingSm" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text variant="bodySm" tone="muted">
            {copy.summary(earned, inProgress)}
          </Text>
        </View>
        {onSeeAll ? <TextLink label={copy.seeAll} onPress={onSeeAll} emphasis="plain" /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {preview.map((p) => (
          <TouchableOpacity
            key={p.badge.id}
            activeOpacity={0.7}
            disabled={!onOpenBadge}
            onPress={() => onOpenBadge?.(p.badge.id)}
            accessibilityRole={onOpenBadge ? 'button' : 'image'}
            accessibilityLabel={`${p.badge.name}, ${p.earned ? profileViewCopy.badges.earned : profileViewCopy.badges.completed(p.done, p.badge.target)}`}
            style={{ flex: 1, alignItems: 'center', gap: 6 }}
          >
            <BadgeArt look={p.badge.look} size={64} locked={!p.earned} />
            {/* Capped: three to a row, a name at 2x would break mid-word on a narrow phone. */}
            <Text variant="labelSm" className="text-center" maxFontSizeMultiplier={1.5}>
              {p.badge.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
