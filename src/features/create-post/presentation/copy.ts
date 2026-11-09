import type { CreatePostErrorCode } from '../domain/entities/CreatePostError';
import type { DraftField, DraftIssue } from '../domain/rules/postDraftRules';
import type { PostKind } from '../domain/postKinds';

/**
 * The create wizard's words, from the Figma frames (light and dark, all four
 * types). The four wizards share a shape and differ in wording, so the copy is
 * one entry per type.
 */

type KindCopy = {
  /** "meetup", "group activity": inside sentences. */
  noun: string;
  header: { title: string; subtitle: string };
  basics: {
    titlePlaceholder: string;
    descriptionPlaceholder: string;
    /** Plans and Groups: the destination field, a cities search. */
    destination?: { label: string; placeholder: string };
    note?: { title: string; body: string };
  };
  schedule: {
    heading: string;
    body: string;
    /** Meetups put date and time side by side with one time; the rest stack start and end. */
    endTime: boolean;
    placeLabel: string;
    placePlaceholder: string;
    /** An Event's schedule or a Plan's itinerary; Meetups and Groups have no list in the API. */
    lines?: { label: string; placeholders: [string, string]; add: string };
    /** A Group's "Repeats" choice. */
    repeat?: boolean;
    tip: string;
  };
  participants: {
    heading: string;
    body: string;
    capacityLabel: string;
    openTitle: string;
    openBody: string;
    privateTitle: string;
    privateBody: string;
    tip: string;
  };
  /**
   * The price step, which the host may skip. Null for a Plan: Plans carry no
   * money, since each stop can cost something different and people settle it in
   * the group chat (backend answers C1/C2).
   */
  price: {
    heading: string;
    body: string;
    priceLabel: string;
    noteTitle: string;
    noteBody: string;
  } | null;
  review: {
    heading: string;
    body: string;
    peopleLabel: string;
    /** The price row's label; a Plan has no price row. */
    priceLabel?: string;
    publish: string;
  };
  published: { title: string; message: string; action: string };
};

const sharedNote = {
  title: 'Good to know',
};

export const kindCopy: Record<PostKind, KindCopy> = {
  meetup: {
    noun: 'meetup',
    header: { title: 'New meetup', subtitle: 'Casual in-person gathering' },
    basics: {
      titlePlaceholder: 'Name your meetup...',
      descriptionPlaceholder: 'Describe the activity and who it’s for.',
    },
    schedule: {
      heading: 'When and where?',
      body: 'Set the date, time and meeting point for the meetup.',
      endTime: false,
      placeLabel: 'Meeting point',
      placePlaceholder: 'Enter a public meeting point',
      tip: 'Choose a clear public meeting point for your first meetup.',
    },
    participants: {
      heading: 'Who can join?',
      body: 'Choose the meetup capacity and how join requests should work.',
      capacityLabel: 'Capacity',
      openTitle: 'Anyone can join',
      openBody: 'Anyone can join while spots are available',
      privateTitle: 'Request to join',
      privateBody: 'You approve attendance requests',
      tip: 'Meet somewhere public for your first meetup.',
    },
    price: {
      heading: 'Is there a price?',
      body: 'Add what each person pays and a link to pay or book, or skip this if there isn’t one.',
      priceLabel: 'Price per person (optional)',
      noteTitle: 'Check before paying',
      noteBody:
        'Confirm the event and payment details before sending money. Pressure to pay is a red flag. Read safety tips.',
    },
    review: {
      heading: 'Review your meetup',
      body: 'Make sure everything looks right before you publish.',
      peopleLabel: 'Travellers',
      priceLabel: 'Price',
      publish: 'Publish meetup',
    },
    published: {
      title: 'Meetup published!',
      message: 'Your meetup is live. Travellers can now discover it and request to join.',
      action: 'View meetup',
    },
  },
  event: {
    noun: 'event',
    header: { title: 'New event', subtitle: 'Ticketed or large-scale event' },
    basics: {
      titlePlaceholder: 'Name your event...',
      descriptionPlaceholder: 'Describe the activity and who it’s for.',
    },
    schedule: {
      heading: 'When and where?',
      body: 'Set the event date, time and venue details.',
      endTime: true,
      placeLabel: 'Venue',
      placePlaceholder: 'Enter the venue name and address',
      lines: { label: 'Event schedule', placeholders: ['Doors open', 'Main event'], add: 'Add schedule item' },
      tip: 'Make sure the venue details are clear before publishing.',
    },
    participants: {
      heading: 'Who can join?',
      body: 'Set event capacity and how attendees can join.',
      capacityLabel: 'Capacity',
      openTitle: 'Anyone can join',
      openBody: 'Anyone can join while spots are available',
      privateTitle: 'Request to join',
      privateBody: 'You approve attendance requests',
      tip: 'Meet somewhere public for your meetup.',
    },
    price: {
      heading: 'Ticketing and price',
      body: 'Add the entry price and a link to pay or book, or skip this if there isn’t one.',
      priceLabel: 'Entry price per person (optional)',
      noteTitle: sharedNote.title,
      noteBody:
        'This is the entry price per person. Payment arrangements stay between the organiser and attendees.',
    },
    review: {
      heading: 'Review your event',
      body: 'Make sure everything looks right before you publish.',
      peopleLabel: 'Travellers',
      priceLabel: 'Entry price',
      publish: 'Publish event',
    },
    published: {
      title: 'Your event is live!',
      message: 'Travellers can now discover your event and join.',
      action: 'View event',
    },
  },
  plan: {
    noun: 'plan',
    header: { title: 'New plan', subtitle: 'Trip or activity with friends' },
    basics: {
      titlePlaceholder: 'Name your plan...',
      descriptionPlaceholder: 'What’s the plan? Who should come?',
      destination: { label: 'Destination', placeholder: 'Search for a city' },
      note: {
        title: 'Plan visibility',
        body: 'Your plan can be shown to travellers in the destination you choose.',
      },
    },
    schedule: {
      heading: 'When and where?',
      body: 'Set the dates, time and meeting details for the plan.',
      endTime: true,
      placeLabel: 'Meeting point',
      placePlaceholder: 'Enter a public meeting point',
      lines: {
        label: 'Itinerary',
        placeholders: ['Day 1 · Arrival + dinner', 'Day 2 · Explore + activity'],
        add: 'Add stop or activity',
      },
      tip: 'Choose a clear public meeting point for your first meetup.',
    },
    participants: {
      heading: 'Who can join?',
      body: 'Choose how many travellers can join and how you want requests handled.',
      capacityLabel: 'Capacity',
      openTitle: 'Anyone can join',
      openBody: 'Anyone can join while spots are available',
      privateTitle: 'Request to join',
      privateBody: 'You approve attendance requests',
      tip: 'Meet somewhere public for your first meetup.',
    },
    // Plans carry no money, so the wizard skips straight from "Who can join?" to the review.
    price: null,
    review: {
      heading: 'Review your plan',
      body: 'Make sure everything looks right before you publish.',
      peopleLabel: 'Travellers',
      publish: 'Publish plan',
    },
    published: {
      title: 'Your plan is live!',
      message: 'Travellers can now discover your plan and request to join.',
      action: 'View plan',
    },
  },
  group: {
    noun: 'group activity',
    header: { title: 'New group activity', subtitle: 'Recurring activity with travellers' },
    basics: {
      titlePlaceholder: 'Name your group activity...',
      descriptionPlaceholder: 'What’s the activity about? Who is it for?',
      destination: { label: 'Location', placeholder: 'Search for a city' },
      note: {
        title: 'Group visibility',
        body: 'Your group activity can be shown to travellers in the location you choose.',
      },
    },
    schedule: {
      heading: 'When does the group meet?',
      body: 'Set the schedule and meeting details for the group activity.',
      endTime: true,
      placeLabel: 'Meeting point',
      placePlaceholder: 'Enter a public meeting point',
      repeat: true,
      tip: 'Choose a clear public meeting point for the first meetup.',
    },
    participants: {
      heading: 'Who can join the group?',
      body: 'Set the group size and choose how new members can join.',
      capacityLabel: 'Group size',
      openTitle: 'Anyone can join',
      openBody: 'Anyone can join while there’s space',
      privateTitle: 'Approve join requests',
      privateBody: 'You approve each new member',
      tip: 'Meet somewhere public for your first group meetup.',
    },
    price: {
      heading: 'Is there a price?',
      body: 'Add what each member pays and a link to pay or book, or skip this if there isn’t one.',
      priceLabel: 'Price per person (optional)',
      noteTitle: sharedNote.title,
      noteBody: 'Payment arrangements stay between you and your members. Pressure to pay is a red flag.',
    },
    review: {
      heading: 'Review your group activity',
      body: 'Make sure the group details look right before you publish.',
      peopleLabel: 'Members',
      priceLabel: 'Price',
      publish: 'Publish group activity',
    },
    published: {
      title: 'Your group activity is live!',
      message: 'Travellers can now discover your group activity and join or request access.',
      action: 'View group activity',
    },
  },
};

export const wizardCopy = {
  saveDraft: 'Save draft',
  loadingDraft: 'Opening your draft',
  draftLoadFailed: 'This draft didn’t open. Check your connection and try again.',
  savingDraft: 'Saving…',
  draftSaved: 'Draft saved',
  next: 'Next',
  back: 'Back',
  close: 'Close',
  photos: {
    label: 'Photos',
    rule: '2–4 photos required',
    add: 'Add photo',
    reorder: 'Drag to reorder. The first photo is the cover.',
    remove: (n: number) => `Remove photo ${n}`,
    item: (n: number) => `Photo ${n}`,
    cover: 'Cover photo',
  },
  title: 'Title',
  description: 'Description',
  safetyTip: 'Safety tip',
  date: 'Date',
  time: 'Time',
  startTime: 'Start time',
  endTime: 'End time (optional)',
  selectDate: 'Select a date',
  selectTime: 'Select a time',
  findingPlace: 'Finding that place…',
  repeat: {
    label: 'Repeats',
    hint: 'Each time it meets, the date moves on and everyone going stays going.',
    options: [
      { value: null, label: 'Doesn’t repeat' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every 2 weeks' },
      { value: 'monthly', label: 'Monthly' },
    ] as const,
    endsOn: 'Last time (optional)',
    untilStopped: 'Until you stop it',
    clearEndsOn: 'Remove last date',
  },
  removeNote: (n: number) => `Remove line ${n}`,
  noteItem: (n: number) => `Line ${n}`,
  people: 'people',
  noLimit: 'No limit',
  fewerPeople: 'Fewer people',
  morePeople: 'More people',
  eventCapacityHint: 'Events are for more than 100 people, or have no limit.',
  groupCapacityHint: 'Groups are for 1 to 100 people.',
  showOnMapTitle: 'Show on map',
  showOnMapBody: 'Visible on public map',
  waitlistTitle: 'Waiting list',
  waitlistBody: 'People can queue for a spot when it’s full',
  amount: 'Amount',
  currency: 'Currency',
  linkLabel: 'Link to pay or book (optional)',
  linkPlaceholder: 'https://',
  /** Moves on from the price step with no price and no link. */
  skipPrice: 'Skip, no price',
  capacity: 'Capacity',
  entryCost: 'Price',
  perPerson: (amount: string) => `${amount} per person`,
  shownBeforeJoin: 'Shown to travellers before they join.',
  noLimitPeople: 'No limit',
  peopleCount: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
  link: 'Link',
  joinSetting: 'Join setting',
  meetingPoint: 'Meeting point',
  interests: {
    label: 'Interests',
    hint: 'Pick 1 to 3, so the right travellers find it.',
    loading: 'Loading interests…',
    failed: 'Interests didn’t load.',
    retry: 'Try again',
  },
  fixFirst: 'A few things need fixing before you publish:',
  goFix: 'Fix',
  publishFailed: {
    title: 'That didn’t go through',
    message: (noun: string) => `We couldn’t publish your ${noun}. Check your connection and try again.`,
    action: 'Try again',
  },
  leave: {
    title: (noun: string) => `Leave this ${noun}?`,
    message: 'Save it as a draft to finish later, or discard what you’ve added.',
    save: 'Save draft',
    discard: 'Discard',
    stay: 'Keep editing',
  },
  places: {
    noCities: 'No cities match that search.',
    noPlaces: 'No places match. You can keep what you typed.',
    unavailable: 'Place search isn’t available right now.',
    /** Under the meeting point when search is down: a typed place still works. */
    typeInstead: 'Type the full address and we’ll find it on the map.',
    looking: 'Getting that place…',
  },
  photoChoice: {
    title: 'Add photos',
    library: 'Choose from library',
    cancel: 'Cancel',
  },
};

/** What a field's issue says under it. */
export const issueCopy: Record<DraftIssue, string> = {
  required: 'This is needed.',
  tooFewPhotos: 'Add at least 2 photos.',
  inPast: 'Pick a time in the future.',
  endBeforeStart: 'End after the start time.',
  capacityRange: 'Pick a size this type allows.',
  priceRange: 'Enter a whole amount from 1 to 1,000,000, or skip the price.',
  tooManyLines: 'Keep it to 30 lines.',
  lineTooLong: 'Keep each line to 120 characters.',
  monthlyDay: 'A monthly group starts on the 1st to the 28th. Pick an earlier date, or repeat weekly.',
  endsBeforeStart: 'Pick a last date on or after the first.',
  notHttps: 'Use a link that starts with https://',
  interestCount: 'Pick 1 to 3 interests.',
};

/** The review step's list of what is still missing, by field. */
export const fieldNames: Record<DraftField, string> = {
  photos: 'Photos (2 to 4)',
  title: 'Title',
  description: 'Description',
  destination: 'Destination',
  date: 'Date',
  startTime: 'Start time',
  endTime: 'End time',
  place: 'Meeting point',
  notes: 'Details',
  recurrence: 'Repeats',
  recurrenceEndsOn: 'Last time it repeats',
  capacity: 'Capacity',
  price: 'Price',
  externalUrl: 'Link to pay or book',
  interests: 'Interests (1 to 3)',
};

export const createPostErrors: Record<CreatePostErrorCode, string> = {
  invalid: 'Some details need fixing before this can go live.',
  eventMonthlyCap: 'You’ve published three events this month, the most allowed.',
  draftLimit: 'You have 20 drafts already. Publish or delete one to save another.',
  conflict: 'This post can’t be changed any more. It may have been cancelled, taken down or already published.',
  imageTooLarge: 'A photo is too large. Try a different one.',
  imageNotSupported: 'Use JPEG, PNG or WebP photos.',
  suspended: 'Your account can’t publish right now. Contact support if this seems wrong.',
  placeNotFound: 'We couldn’t find that place. Pick one from the list, or add the area or city, like “Lekki, Lagos”.',
  placesUnavailable: 'Place search isn’t available right now.',
  busy: 'We’re a little busy. Try again in a moment.',
  rateLimited: 'Too many tries. Wait a moment and try again.',
  network: 'You seem to be offline. Check your connection and try again.',
  sessionExpired: 'Your session ended. Sign in again to continue.',
  unknown: 'Something went wrong on our side. Try again.',
};
