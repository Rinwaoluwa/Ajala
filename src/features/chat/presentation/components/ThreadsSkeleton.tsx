import { View } from 'react-native';

import { SkeletonBlock, SkeletonPulse } from '@shared/components';

import { chatCopy } from '../copy';

/**
 * The list while it loads: rows shaped like ThreadRow — photo, name, last line
 * and the time at the right — breathing together, so the real rows land in the
 * same places.
 */
export function ThreadsSkeleton() {
  return (
    <SkeletonPulse label={chatCopy.loading}>
      {[0.55, 0.4, 0.6, 0.45, 0.5, 0.38, 0.52].map((name, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
          <SkeletonBlock width={56} height={56} radius={28} />
          <View style={{ flex: 1, gap: 10 }}>
            <SkeletonBlock width={`${name * 100}%`} height={16} radius={8} />
            <SkeletonBlock width="82%" height={12} radius={6} />
          </View>
          <SkeletonBlock width={36} height={12} radius={6} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

/**
 * A conversation while it loads: the activity card, then bubbles on alternating
 * sides at the widths real messages take, each with its time line under it.
 */
export function ConversationSkeleton() {
  const bubbles: { mine: boolean; width: `${number}%`; height: number }[] = [
    { mine: false, width: '62%', height: 48 },
    { mine: true, width: '54%', height: 48 },
    { mine: false, width: '70%', height: 70 },
    { mine: true, width: '48%', height: 48 },
    { mine: false, width: '44%', height: 48 },
  ];
  return (
    <SkeletonPulse label={chatCopy.loading}>
      <View style={{ gap: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <SkeletonBlock width={64} height={12} radius={6} />
        </View>
        <SkeletonBlock height={72} radius={16} />
        {bubbles.map((b, i) => (
          <View key={i} style={{ alignItems: b.mine ? 'flex-end' : 'flex-start', gap: 6 }}>
            <SkeletonBlock width={b.width} height={b.height} radius={22} />
            <SkeletonBlock width={b.mine ? 72 : 44} height={10} radius={5} />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}
