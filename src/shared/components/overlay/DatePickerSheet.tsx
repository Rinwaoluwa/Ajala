import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Platform } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * Picks a date, or a time of day (`mode="time"`). Opened by a `SelectField`
 * such as date of birth, or a post's start time.
 *
 * This file is the Android and web implementation: Android's own date dialog,
 * shown while `isPresented` is true. iOS (`DatePickerSheet.ios.tsx`) uses a bottom
 * sheet with a wheel instead, which is the iOS convention for a birth date.
 *
 * Either way the parent keeps the chosen date. `onConfirm` hands back a new one;
 * dismissing without confirming changes nothing.
 *
 * TIME ZONES. Android's Material date picker works in UTC midnight. Handing it a
 * local midnight shows the previous day east of UTC, and reading its answer with
 * local getters gives the previous day west of UTC. So dates cross into the picker
 * as UTC midnight of the same calendar day, and come back as local midnight of the
 * day the user tapped. A birth date is a calendar day, not an instant.
 */

const isAndroid = Platform.OS === 'android';

/** Local calendar day → UTC midnight of that day, as the Android picker expects. */
const toPicker = (date: Date): Date =>
  isAndroid ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) : date;

/** The picker's UTC midnight → local midnight of the same calendar day. */
const fromPicker = (date: Date): Date =>
  isAndroid ? new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) : date;

/** A time is a local instant on both sides; only a calendar day crosses as UTC midnight. */
const passThrough = (date: Date): Date => date;

export type DatePickerSheetProps = {
  isPresented: boolean;
  title: string;
  /** A calendar day (default), or a time of day. */
  mode?: 'date' | 'time';
  /** Where the picker starts. */
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onDismiss: () => void;
};

export function DatePickerSheet({
  isPresented,
  mode = 'date',
  value,
  minimumDate,
  maximumDate,
  onConfirm,
  onDismiss,
}: DatePickerSheetProps) {
  const theme = useTheme();
  if (!isPresented) return null;
  const into = mode === 'date' ? toPicker : passThrough;
  const out = mode === 'date' ? fromPicker : passThrough;

  return (
    <DateTimePicker
      value={into(value)}
      mode={mode}
      presentation="dialog"
      minimumDate={minimumDate ? into(minimumDate) : undefined}
      maximumDate={maximumDate ? into(maximumDate) : undefined}
      accentColor={theme.primary}
      onChange={(_event, date) => {
        if (date) onConfirm(out(date));
      }}
      onDismiss={onDismiss}
    />
  );
}
