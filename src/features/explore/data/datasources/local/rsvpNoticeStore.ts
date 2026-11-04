import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether "Before you RSVP" has been read on this phone. Not sensitive, and per
 * install rather than per account: it is a safety note about the app, not the
 * person. A storage failure reads as "not seen" — showing the note again is the
 * safe side.
 */
const KEY = 'ajala.explore.rsvpNoticeSeen';

export const rsvpNoticeStore = {
  async seen(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEY)) === '1';
    } catch {
      return false;
    }
  },
  async markSeen(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, '1');
    } catch {
      // Shown again next time; nothing else depends on it.
    }
  },
};

export type RsvpNoticeStore = typeof rsvpNoticeStore;
