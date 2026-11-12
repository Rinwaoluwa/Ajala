import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { openInApp } from '@core/links/openInApp';
import { Button, NoteCard, SkeletonBlock, SkeletonPulse, Tag, Text, type TagTone } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { DataExport } from '../../domain/entities/Settings';
import { ConfirmItsYouDialog } from '../components/ConfirmItsYouDialog';
import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useDataExport } from '../hooks/useAccountFlows';

/**
 * Download my data (API map §10, not drawn): what the export holds, the latest
 * one's state (`GET /me/export`), and a button to ask for a new copy
 * (`POST /me/export`, once a day). The file is built on the server and a link
 * is emailed; while the link is good (24 hours) Download opens it in the
 * browser. Both calls may ask "Confirm it's you" first. Once asked for, the
 * card turns to "Being prepared" in place; nothing else pops up.
 */
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

const STATUS_TONE: Record<DataExport['status'], TagTone> = {
  queued: 'pending',
  ready: 'success',
  failed: 'neutral',
};

export function DataExportScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.dataExport;
  const flow = useDataExport();
  const latest = flow.latest;

  return (
    <SettingsFrame
      title={copy.title}
      onBack={onBack}
      footer={
        <Button
          label={latest ? copy.requestAgain : copy.request}
          size="lg"
          fullWidth
          disabled={!flow.canRequest}
          loading={flow.requesting}
          onPress={flow.request}
        />
      }
    >
      <View style={{ gap: 8 }}>
        <Text variant="bodyMd" tone="muted">
          {copy.intro}
        </Text>
        <Text variant="bodySm" tone="muted">
          {copy.limit}
        </Text>
      </View>

      {flow.readNeedsReauth ? (
        <View style={{ gap: 12 }}>
          <Text variant="bodySm" tone="muted">
            {copy.confirmToSee}
          </Text>
          <View style={{ alignSelf: 'flex-start' }}>
            <Button label={copy.confirm} variant="secondary" size="sm" onPress={flow.confirmToRead} />
          </View>
        </View>
      ) : flow.failed ? (
        <LoadFailed onRetry={flow.retry} />
      ) : flow.loading ? (
        <SkeletonPulse>
          <SkeletonBlock height={112} radius={14} />
        </SkeletonPulse>
      ) : latest ? (
        <ExportCard latest={latest} />
      ) : null}

      {flow.requestError ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[flow.requestError]}
        </Text>
      ) : null}

      <ConfirmItsYouDialog
        isPresented={flow.needsReauth}
        onDismiss={flow.cancelReauth}
        onConfirmed={flow.retryAfterReauth}
      />
    </SettingsFrame>
  );
}

function ExportCard({ latest }: { latest: DataExport }) {
  const theme = useTheme();
  const copy = settingsCopy.dataExport;
  // An expired link is still "ready" to the API; it simply has no URL any more.
  if (latest.status === 'ready' && !latest.downloadUrl) {
    return <NoteCard title={copy.status.ready} body={copy.expiredBody} />;
  }
  const body =
    latest.status === 'queued'
      ? copy.queuedBody
      : latest.status === 'failed'
        ? copy.failedBody
        : latest.expiresAt
          ? copy.readyUntil(when(latest.expiresAt))
          : null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={{
        gap: 8,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <View style={{ flexGrow: 1, flexShrink: 1 }}>
          <Text variant="bodyMd">{copy.requestedOn(when(latest.requestedAt))}</Text>
        </View>
        <Tag label={copy.status[latest.status]} tone={STATUS_TONE[latest.status]} />
      </View>
      {body ? (
        <Text variant="bodySm" tone="muted">
          {body}
        </Text>
      ) : null}
      {latest.status === 'ready' && latest.downloadUrl ? (
        <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          <Button
            label={copy.download}
            size="sm"
            onPress={() => void openInApp(latest.downloadUrl ?? '')}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}
