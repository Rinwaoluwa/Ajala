
import { useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import {
  BackButton,
  EmptyState,
  NativeIcon,
  PillTabs,
  Screen,
  Text,
  TextField,
  icons,
} from '@shared/components';
import { haptics } from '@shared/feedback/haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import { SEARCH_MAX } from '../../domain/rules/chatRules';
import { EmptyArt } from '../components/EmptyArt';
import { ThreadRow } from '../components/ThreadRow';
import { ThreadsSkeleton } from '../components/ThreadsSkeleton';
import { chatCopy, chatErrorMessages } from '../copy';
import { useThreads, type ThreadRowModel } from '../hooks/useThreads';

/**
 * Messages (Figma Messages, light and dark): the title, "Search messages", the
 * All / Unread / Groups pills (frosted glass where the phone has it), then the
 * conversations — or the designed empty states: "No messages yet" with
 * "Explore plans", and for a search, "No conversations found" with "Clear
 * search".
 *
 * The frames' compose icon is left out: there is no design for picking who to
 * write to. Chats start from a person's profile (Message) or from an activity,
 * which both open `chatRoutes.start` (see the README).
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

  const renderItem = useCallback(
    ({ item }: { item: ThreadRowModel }) => (
      <ThreadRow row={item} onPress={() => onOpenThread(item.thread.id)} />
    ),
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
    if (vm.q) {
      return (
        <EmptyState
          art={<EmptyArt name="search-outline" />}
          title={chatCopy.noResults.title}
          body={chatCopy.noResults.body(vm.q)}
          action={{ label: chatCopy.noResults.action, onPress: vm.clearSearch, variant: 'primary' }}
        />
      );
    }
    if (vm.filter === 'unread') {
      return <EmptyState art={<EmptyArt name="checkmark-done-outline" />} {...chatCopy.noUnread} />;
    }
    if (vm.filter === 'groups') {
      return <EmptyState art={<EmptyArt name="people-outline" />} {...chatCopy.noGroups} />;
    }
    return (
      <EmptyState
        art={<EmptyArt name="people-outline" />}
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
          <BackButton onPress={onBack} label={chatCopy.back} />
          <Text variant="headingXl" accessibilityRole="header" style={{ flex: 1 }}>
            {chatCopy.title}
          </Text>
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
          maxLength={SEARCH_MAX}
          leading={<NativeIcon source={icons.search} size={16} color={theme.muted} />}
        />
      </View>
      <View style={{ marginTop: 16 }}>
        <PillTabs options={chatCopy.filters} value={vm.filter} onChange={vm.setFilter} />
      </View>

      <FlatList
        data={vm.loading ? [] : vm.rows}
        keyExtractor={(r) => r.thread.id}
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
          <RefreshControl refreshing={vm.refreshing} onRefresh={() => {
              haptics.tap();
              vm.refresh();
            }} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          // The skeleton sits where the rows will land; the empty states sit in the middle.
          vm.loading ? empty : <View style={{ flex: 1, justifyContent: 'center' }}>{empty}</View>
        }
      />
    </Screen>
  );
}
