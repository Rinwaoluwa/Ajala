/**
 * Public API of the `create-post` feature: choosing what to create, and the
 * wizard that creates it (API map §5).
 */

export {
  CreateSomethingSheet,
  type CreateSomethingSheetProps,
} from './presentation/components/CreateSomethingSheet';
export { CreatePostScreen, type CreatePostScreenProps } from './presentation/screens/CreatePostScreen';
export { POST_KINDS, type PostKind } from './domain/postKinds';
export { createPostRoutes } from './presentation/navigation/routes';
