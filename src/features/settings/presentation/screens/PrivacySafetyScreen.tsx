import { ListGroup, ListRow, SkeletonBlock, SkeletonPulse, Text } from '@shared/components';

import { LoadFailed } from '../components/LoadFailed';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { usePreferences } from '../hooks/useSettingsData';
import type { SettingsDestination } from '../navigation/routes';

/**
 * Privacy & safety (Figma, light and dark).
 *
 * PRIVACY: "Profile visibility" is the API's hide-from-search (shown the right way
 * round: on means findable), and "Show my age" its age-band switch — the nearest
 * fields it has (API map §10). "Show current city" and "Open to meet today" have
 * no field yet (§12) and are shown off and inert.
 *
 * SAFETY: Safety tips and Blocked accounts open their screens; "Share my plan"
 * and "Reports" have no API yet (§12).
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
  const inert = { value: false, onChange: () => undefined, disabled: true };

  return (
    <SettingsFrame title={copy.title} onBack={onBack}>
      {prefs.failed ? (
        <LoadFailed onRetry={prefs.retry} />
      ) : !s ? (
        <SkeletonPulse>
          <SkeletonBlock height={240} radius={16} />
        </SkeletonPulse>
      ) : (
        <ListGroup title={copy.privacy}>
          <ListRow
            title={copy.visibility}
            subtitle={copy.visibilityBody}
            toggle={{ value: !s.hiddenFromSearch, onChange: (v) => prefs.update({ hiddenFromSearch: !v }) }}
          />
          <ListRow
            title={copy.showAge}
            subtitle={copy.showAgeBody}
            toggle={{ value: s.showAge, onChange: (v) => prefs.update({ showAge: v }) }}
          />
          <ListRow title={copy.currentCity} subtitle={copy.currentCityBody} toggle={inert} />
          <ListRow title={copy.openToMeet} subtitle={copy.openToMeetBody} toggle={inert} />
        </ListGroup>
      )}
      {prefs.error ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[prefs.error]}
        </Text>
      ) : null}
      <ListGroup title={copy.safety}>
        <ListRow title={copy.tips} subtitle={copy.tipsBody} onPress={() => onNavigate('safetyTips')} />
        <ListRow title={copy.sharePlan} subtitle={copy.sharePlanBody} />
        <ListRow title={copy.blocked} subtitle={copy.blockedBody} onPress={() => onNavigate('blocked')} />
        <ListRow title={copy.reports} subtitle={copy.reportsBody} />
      </ListGroup>
    </SettingsFrame>
  );
}
