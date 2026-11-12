import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Button,
  Chip,
  ChipGroup,
  DatePickerSheet,
  SelectField,
  Text,
  TextField,
  enterRise,
  icons,
} from '@shared/components';
import { FORM_FIELD_GAP } from '@shared/theme';

import { GENDERS, LANGUAGES } from '../../domain/rules/profileSetupRules';
import { chipToneFor } from '../chipTones';
import { AvatarPicker } from '../components/AvatarPicker';
import { CityField } from '../components/CityField';
import { SetupHeader } from '../components/SetupHeader';
import { SetupIntro } from '../components/SetupIntro';
import { SECTION_GAP, SetupScreen } from '../components/SetupScreen';
import { setupCopy } from '../copy';
import { useProfileBasics } from '../hooks/useProfileBasics';

/**
 * "Set up your profile", step 1 of 4 (Figma, empty and filled; light and dark).
 *
 * Measured: the avatar 40pt under the paragraph, "Current city" 44pt under the
 * photo link, chips 6pt apart in rows 8pt apart, Continue 36pt under the chips.
 *
 * Added to the design (flagged): Gender, optional (the API's own text disagrees
 * on whether it completes a profile, spec §8.1, so it is asked but never
 * required); and — only for accounts that lack them — full name and date of
 * birth. They use the same chips and fields as the rest of the app.
 *
 * Sections enter in a short stagger after the heading.
 */

const today = new Date();
const oldest = new Date(today.getFullYear() - 120, 0, 1);

export type ProfileBasicsScreenProps = {
  onContinue: () => void;
};

export function ProfileBasicsScreen({ onContinue }: ProfileBasicsScreenProps) {
  const vm = useProfileBasics();
  const copy = setupCopy.basics;

  return (
    <SetupScreen header={<SetupHeader step={0} />}>
      <SetupIntro title={copy.title} body={copy.body} />

      <Animated.View entering={enterRise(60)} style={{ marginTop: 40 }}>
        <AvatarPicker avatar={vm.avatar} onPress={vm.choosePhoto} />
      </Animated.View>

      <Animated.View entering={enterRise(120)} style={{ marginTop: SECTION_GAP }}>
        {vm.missing.name ? (
          <View style={{ marginBottom: FORM_FIELD_GAP }}>
            <TextField
              label={copy.fullName.label}
              placeholder={copy.fullName.placeholder}
              defaultValue={vm.draft.fullName}
              autoCapitalize="words"
              autoComplete="name"
              onChangeText={vm.changeName}
              onBlur={vm.blurName}
              error={vm.nameError}
              testID="setup-name-field"
            />
          </View>
        ) : null}
        {vm.missing.dateOfBirth ? (
          <View style={{ marginBottom: FORM_FIELD_GAP }}>
            <SelectField
              label={copy.dateOfBirth.label}
              placeholder={copy.dateOfBirth.placeholder}
              value={vm.draft.dateOfBirth ? formatDate(vm.draft.dateOfBirth) : null}
              icon={icons.calendar}
              onPress={vm.datePicker.open}
              error={vm.dateOfBirthError}
              testID="setup-dob-field"
            />
          </View>
        ) : null}

        <Text variant="labelMd" className="mb-8">
          {copy.currentCity}
        </Text>
        <CityField
          label={vm.draft.homeCity?.label ?? null}
          detected={vm.draft.cityDetected}
          detecting={vm.detectingCity}
          detection={vm.cityDetection}
          onFix={vm.fixCity}
        />
      </Animated.View>

      <Animated.View entering={enterRise(180)} style={{ marginTop: SECTION_GAP }}>
        <Text variant="bodyMd" className="mb-12">
          {copy.languages}
        </Text>
        <ChipGroup wrap>
          {LANGUAGES.map((language) => (
            <Chip
              key={language.value}
              label={language.label}
              selected={vm.draft.languages.includes(language.value)}
              tone={chipToneFor(language.label)}
              onPress={() => vm.toggleLanguage(language.value)}
            />
          ))}
        </ChipGroup>

        <Text variant="bodyMd" className="mb-12 mt-24">
          {copy.gender}
        </Text>
        <View accessibilityRole="radiogroup">
          <ChipGroup wrap>
            {GENDERS.map((gender) => (
              <Chip
                key={gender.value}
                label={gender.label}
                role="radio"
                selected={vm.draft.gender === gender.value}
                tone="teal"
                onPress={() => vm.chooseGender(gender.value)}
              />
            ))}
          </ChipGroup>
        </View>
      </Animated.View>

      <View style={{ marginTop: 36 }}>
        <Button
          label={setupCopy.continue}
          size="lg"
          fullWidth
          disabled={!vm.canContinue}
          onPress={onContinue}
          testID="setup-basics-continue"
        />
      </View>

      <DatePickerSheet
        isPresented={vm.datePicker.isPresented}
        title={copy.dateOfBirth.sheetTitle}
        value={
          vm.draft.dateOfBirth
            ? new Date(`${vm.draft.dateOfBirth}T12:00:00`)
            : new Date(today.getFullYear() - 25, 0, 1)
        }
        minimumDate={oldest}
        maximumDate={today}
        onConfirm={vm.datePicker.confirm}
        onDismiss={vm.datePicker.close}
      />
    </SetupScreen>
  );
}

/** "1990-04-07" → "07/04/1990", the field's DD/MM/YYYY. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
