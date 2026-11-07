import type { DemoRoute } from '../demoStore';
import { chatRoutes } from './chat';
import { notificationRoutes } from './notifications';
import { postDetailRoutes } from './postDetail';
import { profileRoutes } from './profiles';
import { settingsRoutes } from './settings';
import { tripRoutes } from './trips';

/**
 * Each area's demo answers, kept in its own file so areas can grow without
 * touching each other. Area files import `demoStore` (never `demoApi`), so there
 * is no import cycle and its values are ready at load.
 */
export const areaRoutes = (): DemoRoute[] => [
  ...postDetailRoutes,
  ...tripRoutes,
  ...profileRoutes,
  ...settingsRoutes,
  ...chatRoutes,
  ...notificationRoutes,
];
