import { View } from 'react-native';

import { ListGroup, ListRow, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';

import type { UserSettings } from '../../domain/entities/Settings';
import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { usePreferences } from '../hooks/useSettingsData';
import type { SettingsDestination } from '../navigation/routes';

/**
 * Privacy & safety (Figma, light and dark; API map §10). Every switch is saved
 * at once and moves back if the server refuses (`usePreferences`).
 *
 * PRIVACY: "Profile visibility" is the API's hide-from-search, shown the right
 * way round (on means findable). "Show current city", "Open to meet today" (the
 * server switches it off at the person's midnight) and "Show my upcoming plans
 * on my profile" (`sharePlans`: lists their upcoming open activities on the
 * public profile, `GET /users/:id/plans`) are the API's settings.
 *
 * "Share my plan" is not `sharePlans`: it is the trusted person — one member who
 * accepts, then hears when plans change (backend answers C6). It has no design
 * yet, so its row is left out rather than shown dead.
 *
 * MESSAGES (not drawn): who can start a chat, one of two, ticked like
 * Appearance's theme; and read receipts.
 *
 * YOUR DATA (not drawn): usage analytics, its own call (`PATCH /me/analytics`),
 * stored as an opt-out and shown as on/off.
 *
 * SAFETY: Safety tips, Blocked accounts and Reports open their screens.
 */
export function PrivacySafetyScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (to: SettingsDestination) => void;
}) {
  const copy = settingsCopy.privacy;
  const prefs = usePreferences();
  const s = prefs.settings;

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      {prefs.failed && !s ? (
        <LoadFailed onRetry={prefs.retry} />
      ) : !s ? (
        <SkeletonPulse>
          <View style={{ gap: 28 }}>
            <SkeletonBlock height={280} radius={16} />
            <SkeletonBlock height={180} radius={16} />
          </View>
        </SkeletonPulse>
      ) : (
        <Preferences settings={s} prefs={prefs} />
      )}
      {prefs.error ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[prefs.error]}
        </Text>
      ) : null}
      <ListGroup title={copy.safety}>
        <ListRow title={copy.tips} subtitle={copy.tipsBody} onPress={() => onNavigate('safetyTips')} />
        <ListRow title={copy.blocked} subtitle={copy.blockedBody} onPress={() => onNavigate('blocked')} />
        <ListRow title={copy.reports} subtitle={copy.reportsBody} onPress={() => onNavigate('reports')} />
      </ListGroup>
    </SettingsFrame>
  );
}

function Preferences({
  settings: s,
  prefs,
}: {
  settings: UserSettings;
  prefs: ReturnType<typeof usePreferences>;
}) {
  const copy = settingsCopy.privacy;
  // Choosing the option already ticked changes nothing, so it sends nothing.
  const setDm = (to: UserSettings['dmPermission']) => {
    if (to !== s.dmPermission) prefs.update({ dmPermission: to });
  };
  return (
    <>
      <ListGroup title={copy.privacy}>
        <ListRow
          title={copy.visibility}
          subtitle={copy.visibilityBody}
          toggle={{ value: !s.hiddenFromSearch, onChange: (v) => prefs.update({ hiddenFromSearch: !v }) }}
        />
        <ListRow
          title={copy.currentCity}
          subtitle={copy.currentCityBody}
          toggle={{ value: s.showCurrentCity, onChange: (v) => prefs.update({ showCurrentCity: v }) }}
        />
        <ListRow
          title={copy.openToMeet}
          subtitle={copy.openToMeetBody}
          toggle={{ value: s.openToMeetToday, onChange: (v) => prefs.update({ openToMeetToday: v }) }}
        />
        <ListRow
          title={copy.showPlans}
          subtitle={copy.showPlansBody}
          toggle={{ value: s.sharePlans, onChange: (v) => prefs.update({ sharePlans: v }) }}
        />
        {/* TODO(trusted-person): the "Share my plan" row goes here once its screens
            are designed — /me/trusted-person and /me/trusted-by, see
            docs/api/backend-answers-2026-11-09.md C6. Hidden until then. */}
      </ListGroup>
      <ListGroup title={copy.messages}>
        <ListRow
          title={copy.readReceipts}
          subtitle={copy.readReceiptsBody}
          toggle={{ value: s.readReceipts, onChange: (v) => prefs.update({ readReceipts: v }) }}
        />
      </ListGroup>
      <View accessibilityRole="radiogroup">
        <ListGroup title={copy.whoCanMessage}>
          <ListRow
            title={copy.anyone}
            subtitle={copy.anyoneBody}
            checked={s.dmPermission === 'anyone'}
            onPress={() => setDm('anyone')}
          />
          <ListRow
            title={copy.sharedOnly}
            subtitle={copy.sharedOnlyBody}
            checked={s.dmPermission === 'shared_only'}
            onPress={() => setDm('shared_only')}
          />
        </ListGroup>
      </View>
      <ListGroup title={copy.data}>
        <ListRow
          title={copy.analytics}
          subtitle={copy.analyticsBody}
          toggle={{ value: !s.analyticsOptOut, onChange: (v) => prefs.setAnalytics(v) }}
        />
      </ListGroup>
    </>
  );
}
