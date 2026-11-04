import { Host } from '@expo/ui';
import { TouchableOpacity, View } from 'react-native';

import { NativeIcon, Sheet, Text, icons, type NativeIconSource } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { profileViewCopy } from '../profileViewCopy';

/**
 * "Profile options" (Figma bottom sheet, the ⋯ on someone's profile): Share
 * profile, Copy profile link, then — under a hairline — Report profile and
 * Block user in red. Each option is a full-width outlined card with its line and
 * an icon at the right. For someone already blocked, the last card unblocks.
 */
export function ProfileOptionsSheet({
  isPresented,
  blocked,
  onDismiss,
  onShare,
  onCopy,
  onReport,
  onBlock,
}: {
  isPresented: boolean;
  blocked: boolean;
  onDismiss: () => void;
  onShare: () => void;
  onCopy: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  const theme = useTheme();
  const copy = profileViewCopy.options;
  return (
    <Sheet isPresented={isPresented} title={copy.title} onDismiss={onDismiss}>
      <View style={{ gap: 12 }}>
        <Option title={copy.share} body={copy.shareBody} icon={icons.share} onPress={onShare} />
        <Option title={copy.copy} body={copy.copyBody} icon={icons.copy} onPress={onCopy} />
        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 4 }} />
        <Option title={copy.report} body={copy.reportBody} icon={icons.flag} onPress={onReport} />
        <Option
          title={blocked ? copy.unblock : copy.block}
          body={blocked ? copy.unblockBody : copy.blockBody}
          icon={icons.block}
          onPress={onBlock}
          destructive={!blocked}
        />
      </View>
    </Sheet>
  );
}

function Option({
  title,
  body,
  icon,
  onPress,
  destructive = false,
}: {
  title: string;
  body: string;
  icon: NativeIconSource;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const tint = destructive ? theme.danger : theme.foreground;
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMd" style={{ color: tint }}>
          {title}
        </Text>
        <Text variant="bodySm" tone="muted">
          {body}
        </Text>
      </View>
      <Host matchContents pointerEvents="none" ignoreSafeArea="all">
        <NativeIcon source={icon} size={18} color={tint} />
      </Host>
    </TouchableOpacity>
  );
}
