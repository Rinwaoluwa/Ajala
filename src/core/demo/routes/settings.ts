import { DAY, fail, invalid, page, registerReset, store, type DemoRoute } from '../demoStore';

/**
 * Demo answers for Settings (spec §2.5, §2.6, §2.15, §6): stored preferences
 * and analytics, signed-in devices, password and email changes, re-auth, a
 * first password, data export, my reports and account deletion. Kept in memory
 * while the app runs, and started again with the rest of the demo world.
 *
 * Any current password works except "wrong" (to see that error); any 6-digit
 * code confirms an email change or a re-auth except 000000. Re-auth is never
 * demanded (as the rest of the demo), but the calls answer when made.
 */

type DemoSettings = {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewComment: boolean;
  notifyNewMessage: boolean;
  notifySubscription: boolean;
  readReceipts: boolean;
  dmPermission: 'anyone' | 'shared_only';
  hiddenFromSearch: boolean;
  analyticsOptOut: boolean;
  showCurrentCity: boolean;
  openToMeetToday: boolean;
  sharePlans: boolean;
};

const DEFAULT_SETTINGS: DemoSettings = {
  notifyJoinRequest: true,
  notifyRequestAccepted: true,
  notifyPostReminder: true,
  notifyNewComment: true,
  notifyNewMessage: true,
  notifySubscription: true,
  readReceipts: true,
  dmPermission: 'anyone',
  hiddenFromSearch: false,
  analyticsOptOut: false,
  showCurrentCity: true,
  openToMeetToday: false,
  sharePlans: true,
};

/** The fields `PATCH /me/settings` takes: everything but analytics, which has its own call. */
const PATCHABLE = Object.keys(DEFAULT_SETTINGS).filter((k) => k !== 'analyticsOptOut');

type DemoExport = {
  id: string;
  requestedAt: number;
  /** The demo's "build" takes a few seconds, so the screen can be seen in both states. */
  readyAt: number;
};

/** How long the demo pretends to build an export. */
const EXPORT_BUILD_MS = 5_000;
const EXPORT_LINK_MS = DAY;

type DemoReport = {
  id: string;
  targetType: 'user' | 'post' | 'comment' | 'message';
  targetId: string;
  reason: 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
};

/** Reports filed before the demo starts; the resolved one matches the inbox's "report resolved". */
const seedReports = (): DemoReport[] => [
  {
    id: 'report-seed-user',
    targetType: 'user',
    targetId: 'host-unknown',
    reason: 'impersonation',
    status: 'resolved',
    createdAt: new Date(Date.now() - 8 * DAY).toISOString(),
    resolvedAt: new Date(Date.now() - 6 * DAY).toISOString(),
  },
  {
    id: 'report-seed-comment',
    targetType: 'comment',
    targetId: 'comment-unknown',
    reason: 'spam',
    status: 'dismissed',
    createdAt: new Date(Date.now() - 21 * DAY).toISOString(),
    resolvedAt: new Date(Date.now() - 20 * DAY).toISOString(),
  },
];

let settings: DemoSettings = { ...DEFAULT_SETTINGS };
/** The day "Open to meet today" was switched on; the server turns it off at midnight. */
let openToMeetDay: string | null = null;
let pendingEmail: string | null = null;
let reauthCodeSent = false;
let latestExport: DemoExport | null = null;
let seededReports = seedReports();
/** When each reported demo post was first listed, standing in for the report's own time. */
let postReportTimes = new Map<string, string>();

let otherSessions = seedOtherSessions();

function seedOtherSessions() {
  return [
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
}

registerReset(() => {
  settings = { ...DEFAULT_SETTINGS };
  openToMeetDay = null;
  pendingEmail = null;
  reauthCodeSent = false;
  latestExport = null;
  seededReports = seedReports();
  postReportTimes = new Map();
  otherSessions = seedOtherSessions();
});

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

const signedIn = () => store.me ?? fail(401, 'UNAUTHORIZED', 'Not signed in (demo).');

const today = () => new Date().toDateString();

/** The settings as the API would answer now: "Open to meet today" lapses at midnight. */
function currentSettings(): DemoSettings {
  if (settings.openToMeetToday && openToMeetDay !== today()) {
    settings = { ...settings, openToMeetToday: false };
    openToMeetDay = null;
  }
  return settings;
}

/** `DataExportDto` for the latest export: queued, then ready with a link for 24 hours. */
function exportDto(e: DemoExport) {
  const now = Date.now();
  const ready = now >= e.readyAt;
  const expiresAt = e.readyAt + EXPORT_LINK_MS;
  return {
    id: e.id,
    status: ready ? 'ready' : 'queued',
    requestedAt: new Date(e.requestedAt).toISOString(),
    readyAt: ready ? new Date(e.readyAt).toISOString() : null,
    expiresAt: ready ? new Date(expiresAt).toISOString() : null,
    // Not a real file: the demo has nothing to download.
    downloadUrl: ready && now < expiresAt ? `https://example.com/ajala-demo-export-${e.id}.zip` : null,
  };
}

/** Seeded reports plus any demo post reported this run, newest first. */
function myReports(): DemoReport[] {
  const posts: DemoReport[] = store.posts
    .filter((p) => p.reported)
    .map((p) => {
      const createdAt = postReportTimes.get(p.id) ?? new Date().toISOString();
      postReportTimes.set(p.id, createdAt);
      return {
        id: `report-${p.id}`,
        targetType: 'post',
        targetId: p.id,
        reason: 'inappropriate_content',
        status: 'open',
        createdAt,
        resolvedAt: null,
      };
    });
  return [...posts, ...seededReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const isStrongPassword = (p: string) => p.length >= 8 && p.length <= 128 && /[A-Z]/.test(p) && /\d/.test(p);

export const settingsRoutes: DemoRoute[] = [
  ['GET', /^\/api\/v1\/me\/settings$/, () => (signedIn(), currentSettings())],
  [
    'PATCH',
    /^\/api\/v1\/me\/settings$/,
    (_m, req) => {
      signedIn();
      const body = (req.body ?? {}) as Record<string, unknown>;
      // Only the documented fields; analytics is refused here as the API's whitelist would.
      const unknown = Object.keys(body).filter((k) => !PATCHABLE.includes(k));
      if (unknown.length) {
        return invalid(unknown.map((field) => ({ field, message: `${field} should not exist` })));
      }
      settings = { ...currentSettings(), ...(body as Partial<DemoSettings>) };
      if ('openToMeetToday' in body) openToMeetDay = settings.openToMeetToday ? today() : null;
      return settings;
    },
  ],
  [
    'PATCH',
    /^\/api\/v1\/me\/analytics$/,
    (_m, req) => {
      signedIn();
      const { enabled } = (req.body ?? {}) as { enabled?: unknown };
      if (typeof enabled !== 'boolean')
        return invalid([{ field: 'enabled', message: 'enabled must be a boolean' }]);
      settings = { ...currentSettings(), analyticsOptOut: !enabled };
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
  // POST /auth/logout/all is answered by demoStore with the other auth calls.

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
    // A first password for a Google- or Apple-only account; it then signs in with email too.
    'POST',
    /^\/api\/v1\/me\/password\/set$/,
    (_m, req) => {
      const me = signedIn();
      const { newPassword } = (req.body ?? {}) as { newPassword?: string };
      if (me.identities.includes('email'))
        return fail(409, 'CONFLICT', 'This account already has a password.');
      if (!newPassword || !isStrongPassword(newPassword)) {
        return invalid([
          { field: 'newPassword', message: '8–128 characters with an uppercase letter and a digit.' },
        ]);
      }
      if (/password/i.test(newPassword))
        return fail(400, 'PASSWORD_BREACHED', 'This password appeared in a breach.');
      store.me = { ...me, identities: [...me.identities, 'email'] };
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/reauth\/code$/,
    () => {
      signedIn();
      reauthCodeSent = true;
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/me\/reauth$/,
    (_m, req) => {
      signedIn();
      const { password, code } = (req.body ?? {}) as { password?: string; code?: string };
      if (code !== undefined) {
        if (!reauthCodeSent || !/^\d{6}$/.test(code) || code === '000000')
          return fail(401, 'UNAUTHORIZED', 'Wrong or expired code.');
        reauthCodeSent = false;
        return undefined;
      }
      return !password || password === 'wrong' ? fail(401, 'UNAUTHORIZED', 'Wrong password.') : undefined;
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
    // One export a day, and none while one is being built (409), as the API.
    'POST',
    /^\/api\/v1\/me\/export$/,
    () => {
      signedIn();
      if (latestExport && Date.now() - latestExport.requestedAt < DAY) {
        return fail(409, 'CONFLICT', 'An export was requested in the last day.');
      }
      const now = Date.now();
      latestExport = { id: `export-${now}`, requestedAt: now, readyAt: now + EXPORT_BUILD_MS };
      return exportDto(latestExport);
    },
  ],
  [
    'GET',
    /^\/api\/v1\/me\/export$/,
    () => {
      signedIn();
      return latestExport ? exportDto(latestExport) : fail(404, 'NOT_FOUND', 'No export requested.');
    },
  ],

  ['GET', /^\/api\/v1\/me\/reports$/, (_m, _r, q) => (signedIn(), page(myReports(), q))],

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
