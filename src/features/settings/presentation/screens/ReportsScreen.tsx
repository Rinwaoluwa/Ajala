import { View } from 'react-native';

import {
  Button,
  EmptyState,
  SkeletonBlock,
  SkeletonPulse,
  Tag,
  Text,
  type TagTone,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { MyReport } from '../../domain/entities/Settings';
import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useReports } from '../hooks/useSettingsData';

/**
 * Your reports (`GET /me/reports`, not drawn): what the person reported, newest
 * first, each with what was reported, why, when, and where it stands. The text
 * they wrote is not returned by the API, so it is not shown. "Show more" loads
 * the next page.
 */
const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_TONE: Record<MyReport['status'], TagTone> = {
  open: 'pending',
  resolved: 'success',
  dismissed: 'neutral',
};

export function ReportsScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.reports;
  const reports = useReports();

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      <Text variant="bodySm" tone="muted">
        {copy.intro}
      </Text>
      {reports.failed && !reports.reports ? (
        <LoadFailed onRetry={reports.retry} />
      ) : !reports.reports ? (
        <SkeletonPulse>
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} height={84} radius={14} />
            ))}
          </View>
        </SkeletonPulse>
      ) : reports.reports.length === 0 ? (
        <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <View style={{ gap: 12 }}>
          {reports.reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
          {reports.moreFailed ? (
            <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
              {settingsErrors.network}
            </Text>
          ) : null}
          {reports.hasMore ? (
            <View style={{ alignSelf: 'center' }}>
              <Button
                label={copy.more}
                variant="secondary"
                size="sm"
                loading={reports.loadingMore}
                onPress={reports.loadMore}
              />
            </View>
          ) : null}
        </View>
      )}
    </SettingsFrame>
  );
}

function ReportCard({ report }: { report: MyReport }) {
  const theme = useTheme();
  const copy = settingsCopy.reports;
  return (
    <View
      style={{
        gap: 6,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
      }}
    >
      {/* Wraps rather than squeezes: at large text the tag drops under the title. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <View style={{ flexGrow: 1, flexShrink: 1 }}>
          <Text variant="bodyMd">{copy.target[report.targetType]}</Text>
        </View>
        <Tag label={copy.status[report.status]} tone={STATUS_TONE[report.status]} />
      </View>
      <Text variant="bodySm" tone="muted">
        {[copy.reason[report.reason], copy.reportedOn(when(report.createdAt))].join(' · ')}
      </Text>
    </View>
  );
}
