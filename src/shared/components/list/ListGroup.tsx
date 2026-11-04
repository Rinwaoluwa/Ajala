import { Host } from '@expo/ui';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';

import { Toggle } from '../form/Toggle';
import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';
import { icons } from '../ui/icons';

/**
 * Settings-style lists (Figma Settings, Privacy & safety, Notifications,
 * Appearance, Account & security): an optional caps heading, then a rounded,
 * outlined card of rows split by hairlines.
 *
 * A `ListRow` is a title with an optional muted line, and at its right one of:
 * a chevron (it opens something), a value ("System"), a count, a tick (the
 * chosen theme), or a switch. `destructive` sets the title in red ("Log out",
 * "Delete account"). Rows grow with the text size; the whole row is the target.
 */

export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ gap: 10 }}>
      {title ? (
        <Text variant="labelSm" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {title}
        </Text>
      ) : null}
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? (
              <View style={{ height: 1, marginHorizontal: 20, backgroundColor: theme.border }} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export type ListRowProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Text at the right ("System", "3"). */
  value?: string;
  /** A tick at the right: the chosen option of a one-of list. */
  checked?: boolean;
  /** A switch at the right instead of a chevron. */
  toggle?: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean };
  destructive?: boolean;
  /** No chevron even though the row opens something (a one-of option). */
  hideChevron?: boolean;
  testID?: string;
};

export function ListRow({
  title,
  subtitle,
  onPress,
  value,
  checked,
  toggle,
  destructive = false,
  hideChevron = false,
  testID,
}: ListRowProps) {
  const theme = useTheme();
  const body = (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMd" tone={destructive ? 'destructive' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodyMd" tone="muted">
          {value}
        </Text>
      ) : null}
      {checked ? (
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.check} size={16} color={theme.primary} />
        </Host>
      ) : null}
      {toggle ? (
        <Toggle
          value={toggle.value}
          onValueChange={toggle.onChange}
          disabled={toggle.disabled}
          accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        />
      ) : onPress && !hideChevron && checked === undefined ? (
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.chevronRight} size={14} color={theme.muted} />
        </Host>
      ) : null}
    </View>
  );

  if (!onPress || toggle) return <View testID={testID}>{body}</View>;
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole={checked === undefined ? 'button' : 'radio'}
      accessibilityState={checked === undefined ? undefined : { checked }}
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join('. ')}
      testID={testID}
    >
      {body}
    </TouchableOpacity>
  );
}
