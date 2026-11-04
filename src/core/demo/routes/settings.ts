import { DAY, fail, store, type DemoRoute } from '../demoStore';

/**
 * Demo answers for Settings (spec §2.6, §2.15, §6): stored preferences, signed-in
 * devices, password and email changes, re-auth and account deletion. Kept in
 * memory while the app runs.
 *
 * Any current password works except "wrong" (to see that error); any 6-digit
 * code confirms an email change except 000000.
 */

const DEFAULT_SETTINGS = {
  notifyJoinRequest: true,
  notifyRequestAccepted: true,
  notifyPostReminder: true,
  notifyNewMessage: true,
  notifyNewComment: true,
  notifySubscription: true,
  readReceipts: true,
  hiddenFromSearch: false,
  analyticsOptOut: false,
  marketingEmails: false,
  dmPermission: 'anyone' as const,
  showAge: false,
  marketingEmailsChangedAt: null as string | null,
};

let settings = { ...DEFAULT_SETTINGS };
let pendingEmail: string | null = null;

const sessions = () => [
  {
    id: 'demo-session',
    deviceName: 'iPhone (this device)',
    ip: null,
    country: 'NG',
    startedAt: new Date(Date.now() - 2 * DAY).toISOString(),
    lastUsedAt: new Date().toISOString(),
    current: true,
  },
  ...otherSessions,
];

let otherSessions = [
  {
    id: 'demo-session-mac',
    deviceName: 'MacBook Air',
    ip: null,
    country: 'GB',
    startedAt: new Date(Date.now() - 20 * DAY).toISOString(),
    lastUsedAt: new Date(Date.now() - 3 * DAY).toISOString(),
    current: false,
  },
];

const signedIn = () => store.me ?? fail(401, 'UNAUTHORIZED', 'Not signed in (demo).');

export const settingsRoutes: DemoRoute[] = [
  ['GET', /^\/api\/v1\/me\/settings$/, () => (signedIn(), settings)],
  [
    'PATCH',
    /^\/api\/v1\/me\/settings$/,
    (_m, req) => {
      signedIn();
      settings = { ...settings, ...(req.body as Partial<typeof settings>) };
      return settings;
    },
  ],

  ['GET', /^\/api\/v1\/me\/sessions$/, () => (signedIn(), sessions())],
  [
    'DELETE',
    /^\/api\/v1\/me\/sessions\/([^/]+)$/,
    (m) => {
      if (m[1] === 'demo-session') return fail(400, 'BAD_REQUEST', 'Use Log out for this device.');
      otherSessions = otherSessions.filter((s) => s.id !== m[1]);
      return undefined;
    },
  ],

  [
    'POST',
    /^\/api\/v1\/me\/password$/,
    (_m, req) => {
      const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
      if (currentPassword === 'wrong') return fail(401, 'UNAUTHORIZED', 'Current password is wrong.');
      if (/password/i.test(newPassword))
        return fail(400, 'PASSWORD_BREACHED', 'This password appeared in a breach.');
      otherSessions = [];
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/reauth$/,
    (_m, req) => {
      const { password } = req.body as { password?: string };
      return password === 'wrong' ? fail(401, 'UNAUTHORIZED', 'Wrong password.') : undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/email\/change$/,
    (_m, req) => {
      const { newEmail } = req.body as { newEmail: string };
      if (newEmail.toLowerCase() === 'taken@ajala.demo')
        return fail(409, 'CONFLICT', 'That email is in use.');
      pendingEmail = newEmail;
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/email\/change\/confirm$/,
    (_m, req) => {
      const { code } = req.body as { code: string };
      if (!pendingEmail || code === '000000') return fail(401, 'UNAUTHORIZED', 'Wrong or expired code.');
      const me = signedIn();
      store.me = { ...me, email: pendingEmail };
      pendingEmail = null;
      otherSessions = [];
      return undefined;
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/me$/,
    () => {
      signedIn();
      return { purgeAt: new Date(Date.now() + 14 * DAY).toISOString() };
    },
  ],

  // Deleting a draft is answered by routes/postDetail.ts (DELETE /posts/:id).
];
