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
  SelectField,
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

import type { Account } from '../../domain/entities/Settings';
import { BIO_MAX, HANDLE_MAX } from '../../domain/rules/settingsRules';
import { LANGUAGES, languageName } from '../../domain/rules/languages';
import { LoadFailed } from '../components/LoadFailed';
import { ProfileChip } from '../components/ProfileChip';
import { SettingsFrame } from '../components/SettingsFrame';
import { settingsCopy, settingsErrors } from '../copy';
import { useEditProfile, type EditProfileViewModel } from '../hooks/useEditProfile';
import { useAccount } from '../hooks/useSettingsData';

/**
 * Edit profile (Figma, light and dark): the photo card ("Change photo", saved at
 * once), Display name, Username (checked as you type), Current city (searched
 * in place), Social links ("Add More"), Bio, and Languages spoken ("Manage").
 * Save sends only what changed; leaving with unsaved changes asks first.
 *
 * Travel style and Favourite locations are in the design but not in the API
 * (API map §12), so they are not shown — flagged in the README.
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
    handleCooldown: settingsErrors.handleCooldown,
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

function CityPicker({ vm }: { vm: EditProfileViewModel }) {
  const theme = useTheme();
  const copy = settingsCopy.edit;
  if (vm.city) {
    return (
      <SelectField
        label={copy.currentCity}
        value={vm.city.label}
        placeholder={copy.cityPlaceholder}
        icon={icons.search}
        onPress={() => vm.chooseCity(null)}
      />
    );
  }
  return (
    <Animated.View layout={LinearTransition.duration(200)}>
      <TextField
        label={copy.currentCity}
        placeholder={copy.cityPlaceholder}
        onChangeText={vm.setCityQuery}
        autoCorrect={false}
        trailing={
          vm.citySearching ? (
            <NativeSpinner size={14} color={theme.muted} />
          ) : (
            <NativeIcon source={icons.search} size={16} color={theme.muted} />
          )
        }
      />
      {vm.cityResults.length > 0 ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={{
            marginTop: 6,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden',
          }}
        >
          {vm.cityResults.slice(0, 6).map((c, i) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.6}
              onPress={() => vm.chooseCity(c)}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.border,
              }}
            >
              <Text variant="bodySm">{c.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
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

function LanguagesSection({ vm }: { vm: EditProfileViewModel }) {
  const copy = settingsCopy.edit;
  const [managing, setManaging] = useState(false);
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="labelXs" tone="muted">
          {copy.languages}
        </Text>
        <TextLink
          label={managing ? copy.done : copy.manage}
          onPress={() => setManaging((m) => !m)}
          emphasis="plain"
        />
      </View>
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
