import { Fragment, useState, type ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { openInApp } from '@core/links/openInApp';
import { Host, NativeIcon, SvgIcon, Text, VectorIcon, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { profileViewCopy } from '../profileViewCopy';

/**
 * "Travel details" (Figma Own Profile, Other User): a pale mint card with a
 * globe heading, then one row per thing the person told us — languages, travel
 * style and favourite places as small pills; their travel journal (website),
 * Instagram and TikTok as links; and, on your own profile, Saved activities.
 * Rows sit under hairlines, each with its icon on the left.
 *
 * The pill rows (languages, travel style, places) show one line of pills. When
 * there are more than fit, "Show more" opens the row to every pill, and the
 * whole row answers the tap the same way; "Show less" closes it again.
 *
 * A link row has a chevron and the whole row answers the tap: it opens in the
 * in-app browser (website, Instagram and TikTok alike). Rows with nothing to
 * show are left out, and so is the card when every row is.
 */

export type TravelDetailsData = {
  languages: string[];
  travelStyles: string[];
  places: string[];
  website?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
};

type Row = {
  key: string;
  icon: ReactNode;
  label: string;
  body?: ReactNode;
  /** A pill row: one line, opening to all of them (`PillLine`). */
  pills?: string[];
  onPress?: () => void;
  /** Opens a page (a link) rather than a screen of the app. */
  link?: boolean;
  a11y: string;
};

export function TravelDetails({
  data,
  onEdit,
  onSaved,
}: {
  data: TravelDetailsData;
  /** Unused: the pill rows open in place now ("Show more"). Kept for callers. */
  onEdit?: () => void;
  /** Your own profile: the Saved activities row. */
  onSaved?: () => void;
}) {
  const theme = useTheme();
  const copy = profileViewCopy;
  const iconColor = theme.primary;
  const rows: Row[] = [];
  void onEdit;

  if (data.languages.length) {
    rows.push({
      key: 'languages',
      icon: <VectorIcon name="chat" size={18} color={iconColor} />,
      label: copy.languages,
      pills: data.languages,
      a11y: `${copy.languages}: ${data.languages.join(', ')}`,
    });
  }
  if (data.travelStyles.length) {
    rows.push({
      key: 'styles',
      icon: <VectorIcon name="luggage" size={18} color={iconColor} />,
      label: copy.travelStyles,
      pills: data.travelStyles,
      a11y: `${copy.travelStyles}: ${data.travelStyles.join(', ')}`,
    });
  }
  if (data.places.length) {
    rows.push({
      key: 'places',
      icon: <VectorIcon name="pin" size={18} color={iconColor} />,
      label: copy.favouriteDestinations,
      pills: data.places,
      a11y: `${copy.favouriteDestinations}: ${data.places.join(', ')}`,
    });
  }

  const handle = (v: string) => v.replace(/^@/, '');
  const link = (key: string, label: string, shown: string, url: string) =>
    rows.push({
      key,
      icon:
        key === 'website' ? (
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.book} size={18} color={iconColor} />
          </Host>
        ) : (
          <SvgIcon name="send" size={16} tint={iconColor} />
        ),
      label,
      body: (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="bodySm" tone="primary" numberOfLines={1} style={{ flexShrink: 1 }}>
            {shown}
          </Text>
          <Host matchContents pointerEvents="none" ignoreSafeArea="all">
            <NativeIcon source={icons.externalLink} size={12} color={theme.primary} />
          </Host>
        </View>
      ),
      // Every link, a website or Instagram and TikTok, opens in the in-app browser.
      onPress: () => void openInApp(url),
      link: true,
      a11y: `${label}: ${shown}. ${copy.openLink(shown)}`,
    });

  if (data.website) {
    const site = data.website;
    link(
      'website',
      copy.travelJournal,
      site.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      site.startsWith('http') ? site : `https://${site}`,
    );
  }
  if (data.instagram) {
    const h = handle(data.instagram);
    link('instagram', copy.instagram, `@${h}`, `https://instagram.com/${h}`);
  }
  if (data.tiktok) {
    const h = handle(data.tiktok);
    link('tiktok', copy.tiktok, `@${h}`, `https://www.tiktok.com/@${h}`);
  }
  if (onSaved) {
    rows.push({
      key: 'saved',
      icon: <VectorIcon name="like" size={18} color={iconColor} />,
      label: '',
      body: <Text variant="bodySm">{copy.savedRow}</Text>,
      onPress: onSaved,
      a11y: copy.savedRow,
    });
  }
  if (!rows.length) return null;

  return (
    <View style={{ borderRadius: 20, backgroundColor: theme.panel, paddingHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 }}>
        <SvgIcon name="countries" size={20} tint={iconColor} />
        <Text variant="headingSm" accessibilityRole="header" style={{ fontSize: 16, lineHeight: 22 }}>
          {copy.travelDetails}
        </Text>
      </View>
      {rows.map((row, i) => (
        <Fragment key={row.key}>
          {i > 0 ? <View style={{ height: 1, marginLeft: 34, backgroundColor: theme.border }} /> : null}
          <DetailRow row={row} />
        </Fragment>
      ))}
    </View>
  );
}

function DetailRow({ row }: { row: Row }) {
  if (row.pills) return <PillRow row={row} pills={row.pills} />;
  return <PlainRow row={row} />;
}

/** One line of pills; "Show more" (or a tap anywhere on the row) opens it to all of them. */
function PillRow({ row, pills }: { row: Row; pills: string[] }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  // Where each pill landed; those below the first line are the ones "Show more" opens.
  const [rowTops, setRowTops] = useState<Record<number, number>>({});
  const tops = Object.values(rowTops);
  const firstTop = Math.min(...tops);
  const beyond = tops.length === pills.length ? tops.filter((y) => y > firstTop + 1).length : 0;
  const canToggle = open || beyond > 0;
  const toggle = () => setOpen((o) => !o);

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}>
      <View style={{ width: 20, alignItems: 'center' }}>{row.icon}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="labelXs">{row.label}</Text>
        {/* Closed: one line's height, the rest cut away cleanly at the line's end. */}
        <View style={open ? null : { maxHeight: PILL_HEIGHT, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {pills.map((label, i) => (
              <View
                // Two cities can share a name; the position keeps their keys apart.
                key={`${i}-${label}`}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  setRowTops((prev) => (prev[i] === y ? prev : { ...prev, [i]: y }));
                }}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: theme.panelPill,
                }}
              >
                <Text variant="bodyXs" numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        {/* Words only: the whole row takes the tap (a second button here caught it too,
            and two toggles undid each other). */}
        {canToggle ? (
          <Text variant="labelSm" tone="link">
            {open ? profileViewCopy.showLess : profileViewCopy.showMore(beyond)}
          </Text>
        ) : null}
      </View>
    </View>
  );
  if (!canToggle) {
    return (
      <View accessible accessibilityLabel={row.a11y}>
        {content}
      </View>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={row.a11y}
      accessibilityState={{ expanded: open }}
    >
      {content}
    </TouchableOpacity>
  );
}

/** A small pill's height: the 16pt line and 2pt above and below. */
const PILL_HEIGHT = 20;

function PlainRow({ row }: { row: Row }) {
  const theme = useTheme();
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}>
      <View style={{ width: 20, alignItems: 'center' }}>{row.icon}</View>
      <View style={{ flex: 1, gap: 4 }}>
        {row.label ? <Text variant="labelXs">{row.label}</Text> : null}
        {row.body}
      </View>
      {row.onPress ? (
        <Host matchContents pointerEvents="none" ignoreSafeArea="all">
          <NativeIcon source={icons.chevronRight} size={12} color={theme.foreground} />
        </Host>
      ) : null}
    </View>
  );
  if (!row.onPress) {
    return (
      <View accessible accessibilityLabel={row.a11y}>
        {content}
      </View>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={row.onPress}
      accessibilityRole={row.link ? 'link' : 'button'}
      accessibilityLabel={row.a11y}
    >
      {content}
    </TouchableOpacity>
  );
}
