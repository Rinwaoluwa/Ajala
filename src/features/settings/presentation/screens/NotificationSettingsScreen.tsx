import { ListGroup, ListRow, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';

import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { usePreferences } from '../hooks/useSettingsData';

/**
 * Notifications (Figma Settings / Notifications): ACTIVITY and DISCOVERY switches
 * over `GET/PATCH /me/settings`. A switch moves at once and moves back if the
 * server refuses.
 *
 * "Activity updates" is two stored toggles behind one switch (request accepted,
 * post reminder — API map §10). "Nearby activities" (`notifyNearbyActivity`, on
 * by default) and "Recommendations" (`notifyRecommendations`, off by default)
 * are saved like the others, but the server sends neither kind yet (backend
 * answers C5) — hence "coming soon" in their descriptions: the choice made now
 * is the one used once they start.
 */
export function NotificationSettingsScreen({ onBack }: { onBack: () => void }) {
  const copy = settingsCopy.notifications;
  const prefs = usePreferences();
  const s = prefs.settings;

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      {prefs.failed ? (
        <LoadFailed onRetry={prefs.retry} />
      ) : !s ? (
        <SkeletonPulse>
          <SkeletonBlock height={220} radius={16} />
        </SkeletonPulse>
      ) : (
        <>
          <ListGroup title={copy.activity}>
            <ListRow
              title={copy.joinRequests}
              subtitle={copy.joinRequestsBody}
              toggle={{ value: s.notifyJoinRequest, onChange: (v) => prefs.update({ notifyJoinRequest: v }) }}
            />
            <ListRow
              title={copy.activityUpdates}
              subtitle={copy.activityUpdatesBody}
              toggle={{
                value: s.notifyPostReminder || s.notifyRequestAccepted,
                onChange: (v) => prefs.update({ notifyPostReminder: v, notifyRequestAccepted: v }),
              }}
            />
            <ListRow
              title={copy.newMessages}
              subtitle={copy.newMessagesBody}
              toggle={{ value: s.notifyNewMessage, onChange: (v) => prefs.update({ notifyNewMessage: v }) }}
            />
          </ListGroup>
          <ListGroup title={copy.discovery}>
            <ListRow
              title={copy.nearby}
              subtitle={copy.nearbyBody}
              toggle={{
                value: s.notifyNearbyActivity,
                onChange: (v) => prefs.update({ notifyNearbyActivity: v }),
              }}
            />
            <ListRow
              title={copy.recommendations}
              subtitle={copy.recommendationsBody}
              toggle={{
                value: s.notifyRecommendations,
                onChange: (v) => prefs.update({ notifyRecommendations: v }),
              }}
            />
          </ListGroup>
          {prefs.error ? (
            <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
              {settingsErrors[prefs.error]}
            </Text>
          ) : null}
        </>
      )}
    </SettingsFrame>
  );
}
