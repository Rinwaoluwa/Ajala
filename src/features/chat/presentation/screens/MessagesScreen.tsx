import Ionicons from '@expo/vector-icons/Ionicons';
import { Host } from '@expo/ui';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';

import {
  Button,
  EmptyState,
  NativeIcon,
  PillTabs,
  Screen,
  Sheet,
  Text,
  TextField,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import type { ChatThread } from '../../domain/entities/Chat';
import { ThreadRow } from '../components/ThreadRow';
import { ThreadsSkeleton } from '../components/ThreadsSkeleton';
import { chatCopy, chatErrorMessages } from '../copy';
import { useThreads } from '../hooks/useThreads';

/**
 * Messages (Figma Messages, light and dark): the title with the compose icon,
 * "Search messages", the All / Unread / Groups pills (frosted glass where the
 * phone has it), then the conversations — or the designed empty states: "No
 * messages yet" with "Explore plans", and for a search, "No conversations
 * found" with "Clear search".
 *
 * Chat is not in the API yet (a proposed endpoint, see the README): until it
 * is, the list is "No messages yet". Demo mode answers it.
 *
 * Rows appear at once (no staggered entrance); the skeleton stands in while the
 * list loads. Pull to refresh; nearing the end loads more.
 */

export type MessagesScreenProps = {
  onBack: () => void;
  onOpenThread: (threadId: string) => void;
  onExplore: () => void;
};

export function MessagesScreen({ onBack, onOpenThread, onExplore }: MessagesScreenProps) {
  const theme = useTheme();
  const vm = useThreads();
  const [composeOpen, setComposeOpen] = useState(false);

  const renderItem = useCallback(
    ({ item }: { item: ChatThread }) => <ThreadRow thread={item} onPress={() => onOpenThread(item.id)} />,
    [onOpenThread],
  );

  const empty = (() => {
    if (vm.loading) return <ThreadsSkeleton />;
    if (vm.error) {
      return (
        <EmptyState
          title={chatErrorMessages[vm.error]}
          action={{ label: chatCopy.retry, onPress: vm.retry, variant: 'primary' }}
        />
      );
    }
    if (vm.q && !vm.unavailable) {
      return (
        <EmptyState
          art={<Art name="search-outline" />}
          title={chatCopy.noResults.title}
          body={chatCopy.noResults.body(vm.q)}
          action={{ label: chatCopy.noResults.action, onPress: vm.clearSearch, variant: 'primary' }}
        />
      );
    }
    if (vm.filter === 'unread' && !vm.unavailable) {
      return <EmptyState art={<Art name="checkmark-done-outline" />} {...chatCopy.noUnread} />;
    }
    if (vm.filter === 'groups' && !vm.unavailable) {
      return <EmptyState art={<Art name="people-outline" />} {...chatCopy.noGroups} />;
    }
    return (
      <EmptyState
        art={<Art name="people-outline" />}
        title={chatCopy.empty.title}
        body={chatCopy.empty.body}
        action={{ label: chatCopy.empty.action, onPress: onExplore, variant: 'primary' }}
      />
    );
  })();

  return (
    <Screen edges={['top']} padded={false}>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={chatCopy.back}
            style={{ marginLeft: -4, padding: 4 }}
          >
            <Host matchContents pointerEvents="none" ignoreSafeArea="all">
              <NativeIcon source={icons.chevronLeft} size={18} color={theme.foreground} />
            </Host>
          </TouchableOpacity>
          <Text variant="headingXl" accessibilityRole="header" style={{ flex: 1 }}>
            {chatCopy.title}
          </Text>
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => setComposeOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={chatCopy.compose}
          >
            <Ionicons name="create-outline" size={28} color={theme.foreground} />
          </TouchableOpacity>
        </View>
        <TextField
          key={vm.searchKey}
          label={chatCopy.search}
          labelHidden
          filled
          placeholder={chatCopy.search}
          onChangeText={vm.setSearch}
          autoCorrect={false}
          returnKeyType="search"
          leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
        />
      </View>
      <View style={{ marginTop: 16 }}>
        <PillTabs options={chatCopy.filters} value={vm.filter} onChange={vm.setFilter} />
      </View>

      <FlatList
        data={vm.loading || vm.unavailable ? [] : vm.threads}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 12,
          paddingBottom: 40,
          flexGrow: 1,
        }}
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          // The skeleton sits where the rows will land; the empty states sit in the middle.
          vm.loading ? empty : <View style={{ flex: 1, justifyContent: 'center' }}>{empty}</View>
        }
      />

      <Sheet
        isPresented={composeOpen}
        title={chatCopy.composeSheet.title}
        onDismiss={() => setComposeOpen(false)}
      >
        <View style={{ gap: 20 }}>
          <Text variant="bodyMd" tone="muted">
            {chatCopy.composeSheet.body}
          </Text>
          <Button
            label={chatCopy.composeSheet.action}
            size="lg"
            fullWidth
            onPress={() => setComposeOpen(false)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

/** The empty states' art: a glyph in a mint circle. */
function Art({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 104,
        height: 104,
        borderRadius: 52,
        backgroundColor: theme.selectedFill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={44} color={theme.selectedForeground} />
    </View>
  );
}
