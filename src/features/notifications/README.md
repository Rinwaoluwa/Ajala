# Feature: Notifications

**FRD coverage:** MOB-180 → MOB-186
**Owner:** _unassigned_ — put your name here when you pick this feature up.

The notifications list opened from the home bell (Figma Notifications): a centred title with a
round back button, All / Unread, and one row per notification — a tinted icon square (or the
sender's photo for a message), title, line, and a short time ("2m", "1h", "1d").

## API gap

The backend has **no notifications list** — it only sends pushes (spec §2.10, API map §11). So
`NotificationsRepositoryImpl` answers an empty list and the screen shows its empty state ("You're
all caught up"). When a list endpoint exists, call it there and map it onto `AppNotification`;
the screen, filters, rows and tap-to-open (`postId`) are already in place. Mark-as-read needs an
endpoint too.

Push *preferences* live in Settings / Notifications (`GET/PATCH /me/settings`).

```
notifications/
├── notificationsModule.ts       composition root
├── data/repositories/           NotificationsRepositoryImpl (empty until the API has a list)
├── domain/                      AppNotification, notificationRules (filter, short times)
└── presentation/                NotificationsScreen, NotificationRow, useNotifications
```
