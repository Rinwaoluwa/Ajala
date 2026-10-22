/**
 * Public API of the `create-post` feature. Today: choosing what to create; the
 * wizard (API map §5) comes next.
 */

export {
  CreateSomethingSheet,
  type CreateSomethingSheetProps,
} from './presentation/components/CreateSomethingSheet';
export { POST_KINDS, type PostKind } from './domain/postKinds';
export { createPostRoutes } from './presentation/navigation/routes';
