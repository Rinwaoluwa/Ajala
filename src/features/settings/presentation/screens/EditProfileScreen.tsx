import { Host } from '@expo/ui';
import { useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import {
  Button,
  Chip,
  ChipGroup,
  NativeIcon,
  NativeSpinner,
  SkeletonBlock,
  SkeletonPulse,
  StatusSheet,
  Text,
  TextArea,
  TextField,
  TextLink,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import type { Account, AccountPlace } from '../../domain/entities/Settings';
import {
  BIO_MAX,
  FAVOURITE_DESTINATIONS_MAX,
  HANDLE_MAX,
  POPULAR_DESTINATION_SEARCHES,
  TRAVEL_STYLES_MAX,
} from '../../domain/rules/settingsRules';
import { LANGUAGES, languageName } from '../../domain/rules/languages';
import { TRAVEL_STYLES, travelStyleLabel } from '../../domain/rules/travelStyles';
import type { SettingsErrorCode } from '../../domain/entities/SettingsError';
import { LoadFailed } from '../components/LoadFailed';
import { ProfileChip } from '../components/ProfileChip';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useEditProfile, type EditProfileViewModel } from '../hooks/useEditProfile';
import { useAccount } from '../hooks/useSettingsData';

/**
 * Edit profile (Figma, light and dark): the photo card ("Change photo", saved at
 * once), Display name, Username (checked as you type), Current city (from the
 * phone's location, not editable), Social links ("Add More"), Bio, Languages spoken, Travel style
 * (up to 10 of the API's 36) and Favourite destinations (up to 10 Google
 * cities, searched, with a few well-known cities as quick searches), each
 * behind "Manage". A city search Google cannot answer says "Place search isn't
 * available right now".
 * Save sends only what changed; leaving with unsaved changes asks first.
 */
export function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const account = useAccount();
  if (account.isError) {
    return (
      <SettingsFrame title={settingsCopy.edit.title} onBack={onBack}>
        <LoadFailed onRetry={() => void account.refetch()} />
      </SettingsFrame>
    );
  }
  if (!account.data) {
    return (
      <SettingsFrame title={settingsCopy.edit.title} onBack={onBack}>
        <SkeletonPulse>
          <View style={{ gap: 20 }}>
            <SkeletonBlock width={230} height={84} radius={16} />
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} height={58} radius={8} />
            ))}
          </View>
        </SkeletonPulse>
      </SettingsFrame>
    );
  }
  return <EditProfileForm account={account.data} onBack={onBack} />;
}

function EditProfileForm({ account, onBack }: { account: Account; onBack: () => void }) {
  const copy = settingsCopy.edit;
  const vm = useEditProfile(account);

  const leave = () => {
    if (!vm.dirty || vm.saved) return onBack();
    Alert.alert(copy.discardTitle, undefined, [
      { text: copy.keepEditing, style: 'cancel' },
      { text: copy.discard, style: 'destructive', onPress: onBack },
    ]);
  };

  return (
    <SettingsFrame
      title={copy.title}
      onBack={leave}
      footer={
        <Button
          label={copy.save}
          size="lg"
          fullWidth
          disabled={!vm.canSave}
          loading={vm.saving}
          onPress={vm.save}
        />
      }
    >
      <View style={{ gap: 6 }}>
        <View>
          <ProfileChip
            name={copy.photo}
            avatarName={account.firstName}
            avatarUrl={vm.photoUri}
            subtitle={copy.changePhoto}
            onPress={vm.uploadingPhoto ? undefined : vm.choosePhoto}
            accessibilityLabel={copy.changePhoto}
          />
          {vm.uploadingPhoto ? (
            <View style={{ position: 'absolute', left: 34, top: 34 }} pointerEvents="none">
              <Host matchContents>
                <NativeSpinner size={16} color="#FFFFFF" />
              </Host>
            </View>
          ) : null}
        </View>
        {vm.photoError ? (
          <Text variant="bodyXs" tone="destructive" accessibilityLiveRegion="polite">
            {settingsErrors[vm.photoError]}
          </Text>
        ) : null}
      </View>

      <TextField
        label={copy.displayName}
        defaultValue={vm.displayName}
        onChangeText={vm.setDisplayName}
        autoCapitalize="words"
        autoComplete="name"
        error={vm.nameError}
      />
      <UsernameField vm={vm} />
      <CityPicker vm={vm} />
      <SocialLinksFields vm={vm} />
      <TextArea
        label={copy.bio}
        placeholder={copy.bioPlaceholder}
        defaultValue={vm.bio}
        onChangeText={vm.setBio}
        maxLength={BIO_MAX}
        lines={3}
        helper={`${vm.bio.length}/${BIO_MAX}`}
      />
      <LanguagesSection vm={vm} />
      <TravelStyleSection vm={vm} />
      <FavouritesSection vm={vm} />

      {vm.saveError ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[vm.saveError]}
        </Text>
      ) : null}
      <StatusSheet
        isPresented={vm.saved}
        tone="success"
        title={copy.saved}
        message={copy.savedBody}
        actionLabel={settingsCopy.ok}
        onAction={onBack}
        onDismiss={onBack}
      />
    </SettingsFrame>
  );
}

function UsernameField({ vm }: { vm: EditProfileViewModel }) {
  const theme = useTheme();
  const copy = settingsCopy.edit;
  const errors: Record<string, string> = {
    taken: copy.usernameTaken,
    handleTaken: copy.usernameTaken,
    format: copy.usernameFormat,
    reserved: copy.usernameReserved,
    // The date only when the server sent one; the spec no longer promises it.
    handleCooldown: vm.cooldownUntil
      ? copy.cooldownUntil(
          new Date(vm.cooldownUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
        )
      : settingsErrors.handleCooldown,
  };
  return (
    <TextField
      label={copy.username}
      defaultValue={vm.handle}
      onChangeText={vm.setHandle}
      prefix="@"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="username"
      maxLength={HANDLE_MAX + 1}
      error={vm.handleError ? errors[vm.handleError] : null}
      helper={
        vm.handleStatus === 'checking'
          ? copy.usernameChecking
          : vm.handleStatus === 'available'
            ? copy.usernameAvailable
            : null
      }
      trailing={
        vm.handleStatus === 'checking' ? (
          <NativeSpinner size={14} color={theme.muted} />
        ) : vm.handleStatus === 'available' ? (
          <NativeIcon source={icons.checkCircle} size={16} color={theme.success} />
        ) : undefined
      }
    />
  );
}

/**
 * "Current city", read-only: always where the phone is (looked up on open), so
 * there is nothing to search. Without location it keeps the saved city.
 */
function CityPicker({ vm }: { vm: EditProfileViewModel }) {
  const theme = useTheme();
  const copy = settingsCopy.edit;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="labelMd">{copy.currentCity}</Text>
      <View
        accessible
        accessibilityLabel={`${copy.currentCity}: ${vm.city?.label ?? copy.cityUnknown}`}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.controlBorder,
          backgroundColor: theme.chipFill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.location} size={16} color={theme.muted} />
        </Host>
        <Text variant="bodySm" tone={vm.city ? undefined : 'muted'} style={{ flex: 1 }}>
          {vm.city?.label ?? (vm.cityDetecting ? copy.cityDetecting : copy.cityUnknown)}
        </Text>
        {vm.cityDetecting ? (
          <Host matchContents>
            <NativeSpinner size={14} color={theme.muted} />
          </Host>
        ) : vm.cityDetected ? (
          <Text variant="bodyXs" tone="muted">
            {copy.cityAutoDetected}
          </Text>
        ) : null}
      </View>
      <Text variant="bodyXs" tone="muted">
        {copy.cityHelper}
      </Text>
    </View>
  );
}

function SocialLinksFields({ vm }: { vm: EditProfileViewModel }) {
  const copy = settingsCopy.edit;
  const [more, setMore] = useState(Boolean(vm.links.tiktok || vm.links.website));
  return (
    <Animated.View layout={LinearTransition.duration(200)} style={{ gap: 12 }}>
      <Text variant="labelXs" tone="muted">
        {copy.socialLinks}
      </Text>
      <TextField
        label={copy.instagram}
        labelHidden={!more}
        placeholder={more ? '@yourname' : copy.socialPlaceholder}
        defaultValue={vm.links.instagram ?? ''}
        onChangeText={vm.linkSetters.instagram}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {more ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 12 }}>
          <TextField
            label={copy.tiktok}
            placeholder="@yourname"
            defaultValue={vm.links.tiktok ?? ''}
            onChangeText={vm.linkSetters.tiktok}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label={copy.website}
            placeholder="https://"
            defaultValue={vm.links.website ?? ''}
            onChangeText={vm.linkSetters.website}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Animated.View>
      ) : (
        <TextLink label={copy.addMore} onPress={() => setMore(true)} emphasis="plain" />
      )}
    </Animated.View>
  );
}

/**
 * A section's label with "Manage" / "Done" at the right, and a count while
 * managing a capped list. Wraps rather than overlapping at large text sizes.
 */
function SectionHeader({
  title,
  managing,
  onToggle,
  count,
}: {
  title: string;
  managing: boolean;
  onToggle: () => void;
  count?: string;
}) {
  const copy = settingsCopy.edit;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: 12,
      }}
    >
      <Text variant="labelXs" tone="muted" style={{ flexShrink: 1 }}>
        {count && managing ? `${title} · ${count}` : title}
      </Text>
      <TextLink label={managing ? copy.done : copy.manage} onPress={onToggle} emphasis="plain" />
    </View>
  );
}

function LanguagesSection({ vm }: { vm: EditProfileViewModel }) {
  const copy = settingsCopy.edit;
  const [managing, setManaging] = useState(false);
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={{ gap: 10 }}>
      <SectionHeader title={copy.languages} managing={managing} onToggle={() => setManaging((m) => !m)} />
      {managing ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <ChipGroup>
            {LANGUAGES.map((l) => (
              <Chip
                key={l.code}
                label={l.name}
                selected={vm.languages.includes(l.code)}
                onPress={() => vm.toggleLanguage(l.code)}
              />
            ))}
          </ChipGroup>
        </Animated.View>
      ) : vm.languages.length ? (
        <ChipGroup>
          {vm.languages.map((code) => (
            <Chip key={code} label={languageName(code)} selected={false} onPress={() => setManaging(true)} />
          ))}
        </ChipGroup>
      ) : (
        <Text variant="bodySm" tone="muted">
          {copy.noLanguages}
        </Text>
      )}
    </Animated.View>
  );
}

function TravelStyleSection({ vm }: { vm: EditProfileViewModel }) {
  const copy = settingsCopy.edit;
  const [managing, setManaging] = useState(false);
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={{ gap: 10 }}>
      <SectionHeader
        title={copy.travelStyle}
        managing={managing}
        onToggle={() => setManaging((m) => !m)}
        count={copy.pickedCount(vm.travelStyles.length, TRAVEL_STYLES_MAX)}
      />
      {managing ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <ChipGroup>
            {TRAVEL_STYLES.map((s) => {
              const selected = vm.travelStyles.includes(s.value);
              return (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={selected}
                  disabled={vm.travelStylesFull && !selected}
                  onPress={() => vm.toggleTravelStyle(s.value)}
                />
              );
            })}
          </ChipGroup>
        </Animated.View>
      ) : vm.travelStyles.length ? (
        <ChipGroup>
          {vm.travelStyles.map((style) => (
            <Chip
              key={style}
              label={travelStyleLabel(style)}
              selected={false}
              onPress={() => setManaging(true)}
            />
          ))}
        </ChipGroup>
      ) : (
        <Text variant="bodySm" tone="muted">
          {copy.noTravelStyles}
        </Text>
      )}
    </Animated.View>
  );
}

/**
 * Favourite destinations: the chosen cities, and while managing, a Google
 * cities search plus a few well-known cities as quick searches (the API no
 * longer ranks popular cities). A quick search fills the field rather than
 * adding a guessed place, so the person still picks the real city. Tapping a
 * chosen city takes it out. Closing "Manage" ends the search session.
 */
function FavouritesSection({ vm }: { vm: EditProfileViewModel }) {
  const theme = useTheme();
  const copy = settingsCopy.edit;
  const [managing, setManaging] = useState(false);
  const chosen = (c: AccountPlace) => vm.favourites.some((f) => f.placeId === c.placeId);
  const chosenNames = new Set(vm.favourites.map((f) => f.name.toLowerCase()));
  const quickSearches = vm.favouritesFull
    ? []
    : POPULAR_DESTINATION_SEARCHES.filter((name) => !chosenNames.has(name.toLowerCase()));
  const toggleManaging = () => {
    if (managing) vm.closeDestinations();
    setManaging((m) => !m);
  };

  return (
    <Animated.View layout={LinearTransition.duration(220)} style={{ gap: 10 }}>
      <SectionHeader
        title={copy.favouriteLocations}
        managing={managing}
        onToggle={toggleManaging}
        count={copy.pickedCount(vm.favourites.length, FAVOURITE_DESTINATIONS_MAX)}
      />
      {vm.favourites.length ? (
        <ChipGroup>
          {vm.favourites.map((c) => (
            <Chip
              key={c.placeId}
              label={c.name}
              selected={managing}
              onPress={() => (managing ? vm.toggleFavourite(c) : setManaging(true))}
            />
          ))}
        </ChipGroup>
      ) : managing ? null : (
        <Text variant="bodySm" tone="muted">
          {copy.noFavourites}
        </Text>
      )}
      {managing ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: 10 }}>
          <TextField
            key={vm.destField.key}
            defaultValue={vm.destField.text}
            label={copy.favouriteLocations}
            labelHidden
            placeholder={copy.destinationPlaceholder}
            onChangeText={vm.setDestQuery}
            autoCorrect={false}
            trailing={
              vm.destSearching ? (
                <NativeSpinner size={14} color={theme.muted} />
              ) : (
                <NativeIcon source={icons.search} size={16} color={theme.muted} />
              )
            }
          />
          <SearchNote failure={vm.destFailure} noMatches={vm.destNoMatches} />
          {vm.destResults.length > 0 ? (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                overflow: 'hidden',
              }}
            >
              {vm.destResults.slice(0, 6).map((c, i) => {
                const picked = chosen(c);
                const blocked = vm.favouritesFull && !picked;
                return (
                  <TouchableOpacity
                    key={c.placeId}
                    activeOpacity={0.6}
                    disabled={blocked}
                    onPress={() => vm.toggleFavourite(c)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: picked, disabled: blocked }}
                    accessibilityLabel={c.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: theme.border,
                      opacity: blocked ? 0.4 : 1,
                    }}
                  >
                    <Text variant="bodySm" style={{ flex: 1 }}>
                      {c.label}
                    </Text>
                    {picked ? (
                      <NativeIcon source={icons.checkCircle} size={16} color={theme.success} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {quickSearches.length ? (
            <>
              <Text variant="labelXs" tone="muted">
                {copy.popular}
              </Text>
              <ChipGroup>
                {quickSearches.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    selected={false}
                    onPress={() => vm.searchDestination(name)}
                  />
                ))}
              </ChipGroup>
            </>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Under a city search: why it found nothing, when it found nothing. */
function SearchNote({ failure, noMatches }: { failure: SettingsErrorCode | null; noMatches: boolean }) {
  if (!failure && !noMatches) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={{ marginTop: 6 }}>
      <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">
        {failure ? settingsErrors[failure] : settingsCopy.edit.noCityMatches}
      </Text>
    </Animated.View>
  );
}
