import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  Button,
  Chip,
  ChipGroup,
  EmojiBadge,
  Host,
  icons,
  NativeIcon,
  NativeSpinner,
  SkeletonBlock,
  SkeletonPulse,
  SortableGrid,
  SuccessSheet,
  Text,
  TextArea,
  TextField,
  TextLink,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

import type { Account, AccountPlace, ProfilePhoto } from '../../domain/entities/Settings';
import {
  BIO_MAX,
  FAVOURITE_DESTINATIONS_MAX,
  HANDLE_MAX,
  INTERESTS_MAX,
  PHOTOS_MAX,
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
import { haptics } from '@shared/feedback/haptics';

/**
 * Edit profile (Figma, light and dark): the photo card ("Change photo", saved at
 * once), the gallery (up to six photos, each saved or removed at once), Display
 * name, Username (checked as you type), Current city (from the
 * phone's location, not editable), Social links ("Add More"), Bio, Languages spoken, Travel style
 * (up to 10 of the API's 36), Favourite destinations (up to 10 Google
 * cities, searched, with a few well-known cities as quick searches) and
 * Interests (3 to 8 of the server's list), each behind "Manage". A city search
 * Google cannot answer says "Place search isn't available right now".
 * Save sends only what changed; leaving with unsaved changes asks first.
 *
 * A read that fails after the account was seen once keeps showing that copy:
 * the failure only shows when there is nothing to draw.
 */
export function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const account = useAccount();
  if (!account.data && account.isError) {
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
    haptics.warning();
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

      <GallerySection vm={vm} />

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
      <InterestsSection vm={vm} />
      <LanguagesSection vm={vm} />
      <TravelStyleSection vm={vm} />
      <FavouritesSection vm={vm} />

      {vm.saveError ? (
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[vm.saveError]}
        </Text>
      ) : null}
      {/* Saved: celebrated with confetti (`SuccessSheet`). */}
      <SuccessSheet
        isPresented={vm.saved}
        art={
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.checkCircle} size={28} color={palette.success} />
          </Host>
        }
        title={copy.saved}
        message={copy.savedBody}
        actionLabel={settingsCopy.ok}
        onAction={onBack}
        celebrate
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
            : vm.handleStatus === 'checkFailed'
              ? copy.usernameCheckFailed
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
 * The gallery (spec §2.4, up to six): square thumbnails three to a row, each
 * with a small ✕ (asked first), and an "Add photo" tile while there is room.
 * Each photo is saved or removed at once; a tile spins while its upload runs.
 *
 * Hold a photo and drag it to change the order (`PUT /me/photos/order`): the
 * first is the one travellers see first. Saved as soon as it is dropped.
 */
function GallerySection({ vm }: { vm: EditProfileViewModel }) {
  const theme = useTheme();
  const copy = settingsCopy.edit;
  const confirmRemove = (photo: ProfilePhoto) => {
    haptics.warning();
    Alert.alert(copy.removePhotoTitle, copy.removePhotoBody, [
      { text: copy.keepPhoto, style: 'cancel' },
      { text: copy.removePhotoConfirm, style: 'destructive', onPress: () => vm.removePhoto(photo) },
    ]);
  };
  const tile = {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden' as const,
    backgroundColor: theme.skeleton,
  };
  // After the saved photos, which move: the uploads on their way, then the add tile.
  const fixed = [
    ...Array.from({ length: vm.uploadingPhotos }, (_, i) => (
      <View key={`up-${i}`} style={[tile, { alignItems: 'center', justifyContent: 'center' }]}>
        <Host matchContents>
          <NativeSpinner size={18} color={theme.muted} />
        </Host>
      </View>
    )),
    ...(vm.photos.length + vm.uploadingPhotos < PHOTOS_MAX
      ? [
          <TouchableOpacity
            key="add"
            activeOpacity={0.7}
            onPress={vm.addPhotos}
            accessibilityRole="button"
            accessibilityLabel={copy.addPhoto}
            style={[
              tile,
              {
                backgroundColor: theme.chipFill,
                borderWidth: 1,
                borderColor: theme.controlBorder,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              },
            ]}
          >
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.add} size={18} color={theme.primary} />
            </Host>
            <Text variant="bodyXs" tone="primary">
              {copy.addPhoto}
            </Text>
          </TouchableOpacity>,
        ]
      : []),
  ];

  return (
    <View style={{ gap: 10 }}>
      <Text variant="labelXs" tone="muted">
        {`${copy.photos} · ${copy.pickedCount(vm.photos.length, PHOTOS_MAX)}`}
      </Text>
      <SortableGrid
        items={vm.photos}
        keyOf={(p) => p.id}
        columns={3}
        gap={8}
        cellHeight={(w) => w}
        onMove={vm.movePhoto}
        disabled={!vm.canReorder}
        itemLabel={(i) => copy.photoItem(i + 1)}
        footer={fixed}
        renderItem={(photo, index) => (
          <View style={tile} accessible accessibilityLabel={copy.photoItem(index + 1)}>
            <Image source={{ uri: photo.thumbUrl }} style={{ flex: 1 }} contentFit="cover" transition={200} />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                minWidth: 22,
                height: 22,
                paddingHorizontal: 5,
                borderRadius: 11,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="bodyXs" maxFontSizeMultiplier={1.3} style={{ color: '#FFFFFF' }}>
                {index + 1}
              </Text>
            </View>
            {vm.removingPhotoId === photo.id ? (
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                }}
              >
                <Host matchContents>
                  <NativeSpinner size={18} color="#FFFFFF" />
                </Host>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => confirmRemove(photo)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={copy.removePhoto}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Host matchContents pointerEvents="none" ignoreSafeArea="all">
                  <NativeIcon source={icons.close} size={11} color="#FFFFFF" />
                </Host>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <Text variant="bodyXs" tone="muted">
        {vm.photos.length > 1 ? copy.photosReorderHelper(PHOTOS_MAX) : copy.photosHelper(PHOTOS_MAX)}
      </Text>
      {vm.galleryError ? (
        <Text variant="bodyXs" tone="destructive" accessibilityLiveRegion="polite">
          {settingsErrors[vm.galleryError]}
        </Text>
      ) : null}
    </View>
  );
}


/**
 * Interests (`PATCH /me { interestIds }`, 3–8 of `GET /interests`): the chosen
 * ones as chips, and behind "Manage" the whole list to pick from. One or two
 * chosen cannot be saved; the line under says so.
 */
function InterestsSection({ vm }: { vm: EditProfileViewModel }) {
  const copy = settingsCopy.edit;
  const [managing, setManaging] = useState(false);
  const chosen = (vm.allInterests ?? []).filter((i) => vm.interestIds.includes(i.id));
  return (
    <Animated.View style={{ gap: 10 }}>
      <SectionHeader
        title={copy.interests}
        managing={managing}
        onToggle={() => setManaging((m) => !m)}
        count={copy.pickedCount(vm.interestIds.length, INTERESTS_MAX)}
      />
      {vm.interestsLoading ? (
        <SkeletonPulse>
          <ChipGroup gap={8} rowGap={8}>
            {[90, 120, 70, 100].map((w, i) => (
              <SkeletonBlock key={i} width={w} height={36} radius={18} />
            ))}
          </ChipGroup>
        </SkeletonPulse>
      ) : vm.interestsFailed && !vm.allInterests ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12 }}>
          <Text variant="bodySm" tone="muted">
            {copy.interestsLoadFailed}
          </Text>
          <TextLink label={copy.retry} onPress={vm.retryInterests} emphasis="plain" />
        </View>
      ) : managing ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <ChipGroup gap={8} rowGap={10}>
            {(vm.allInterests ?? []).map((interest) => {
              const selected = vm.interestIds.includes(interest.id);
              return (
                <Chip
                  key={interest.id}
                  label={interest.name}
                  leading={<EmojiBadge emoji={interest.emoji} />}
                  selected={selected}
                  disabled={vm.interestsFull && !selected}
                  onPress={() => vm.toggleInterest(interest.id)}
                />
              );
            })}
          </ChipGroup>
        </Animated.View>
      ) : chosen.length ? (
        <ChipGroup gap={8} rowGap={10}>
          {chosen.map((interest) => (
            <Chip
              key={interest.id}
              label={interest.name}
              leading={<EmojiBadge emoji={interest.emoji} />}
              selected={false}
              onPress={() => setManaging(true)}
            />
          ))}
        </ChipGroup>
      ) : (
        <Text variant="bodySm" tone="muted">
          {copy.noInterests}
        </Text>
      )}
      {!vm.interestsOk ? (
        <Text variant="bodyXs" tone="destructive" accessibilityLiveRegion="polite">
          {copy.interestsRule}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/**
 * "Current city", read-only: always where the phone is (looked up on open), so
 * there is nothing to search. Without location it keeps the saved city; with
 * neither it says location is off, and offers Settings when only they can turn it on.
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
        {/* The box is pale in both schemes (chipFill), so its text stays ink, as in setup's
            CityField: the scheme's own text colour is light on dark and vanished here. */}
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.location} size={16} color={palette.inkSecondary} />
        </Host>
        <Text variant="bodySm" style={{ flex: 1, color: vm.city ? palette.ink : palette.inkSecondary }}>
          {vm.city?.label ?? (vm.cityDetecting ? copy.cityDetecting : copy.cityUnknown)}
        </Text>
        {vm.cityDetecting ? (
          <Host matchContents>
            <NativeSpinner size={14} color={palette.inkSecondary} />
          </Host>
        ) : vm.cityDetected ? (
          <Text variant="bodyXs" style={{ color: palette.inkSecondary }}>
            {copy.cityAutoDetected}
          </Text>
        ) : null}
      </View>
      {vm.cityNeedsLocation ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12 }}>
          <Text variant="bodyXs" tone="muted">
            {copy.cityNeedsLocation}
          </Text>
          {vm.cityBlocked ? (
            <TextLink label={copy.cityOpenSettings} onPress={vm.openLocationSettings} emphasis="plain" />
          ) : null}
        </View>
      ) : (
        <Text variant="bodyXs" tone="muted">
          {copy.cityHelper}
        </Text>
      )}
    </View>
  );
}

function SocialLinksFields({ vm }: { vm: EditProfileViewModel }) {
  const copy = settingsCopy.edit;
  const [more, setMore] = useState(Boolean(vm.links.tiktok || vm.links.website));
  return (
    <Animated.View style={{ gap: 12 }}>
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
    <Animated.View style={{ gap: 10 }}>
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
    <Animated.View style={{ gap: 10 }}>
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
    <Animated.View style={{ gap: 10 }}>
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
            leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
            // The spinner while searching; otherwise the × that empties the field.
            clearable
            trailing={vm.destSearching ? <NativeSpinner size={14} color={theme.muted} /> : undefined}
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
                    {/* A native (SwiftUI) icon must sit in a Host: bare inside this row it crashed the
                        app the moment a city was picked. */}
                    {picked ? (
                      <Host matchContents pointerEvents="none">
                        <NativeIcon source={icons.checkCircle} size={16} color={theme.success} />
                      </Host>
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
