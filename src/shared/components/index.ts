/**
 * Public surface of the shared component library.
 *
 * Features import from `@shared/components`, never from a file inside it.
 * See docs/COMPONENTS.md for the Expo UI / React Native split.
 */

// Expo UI — native controls
export {
  Button,
  ButtonCore,
  buttonMetrics,
  type ButtonProps,
  type ButtonCoreProps,
  type ButtonVariant,
  type ButtonSize,
} from './ui/Button';
export { TextLink, type TextLinkProps, type TextLinkTone, type TextLinkEmphasis } from './ui/TextLink';
export { NativeIcon, type NativeIconProps, type NativeIconSource } from './ui/NativeIcon';
export { Host } from './ui/Host';
export { icons } from './ui/icons';
export { NativeSpinner, type NativeSpinnerProps } from './ui/NativeSpinner';
export { SvgIcon, type SvgIconName, type SvgIconProps } from './ui/SvgIcon';
export { VectorIcon, type VectorIconName, type VectorIconProps } from './ui/VectorIcon';
export { Illustration, type IllustrationName } from './ui/Illustration';
export { TextField, type TextFieldProps, type TrailingAction } from './form/TextField';
export { PasswordField, type PasswordFieldProps } from './form/PasswordField';
export { SelectField, type SelectFieldProps } from './form/SelectField';
export { TextArea, type TextAreaProps } from './form/TextArea';
export { Toggle, type ToggleProps } from './form/Toggle';
export { Chip, ChipGroup, type ChipProps, type ChipGroupProps, type ChipTone } from './form/Chip';
export { ScreenHeader, SCREEN_HEADER_HEIGHT, type ScreenHeaderProps } from './layout/ScreenHeader';
export { DatePickerSheet, type DatePickerSheetProps } from './overlay/DatePickerSheet';
export {
  StatusSheet,
  type StatusSheetProps,
  type StatusSheetTone,
  type StatusSheetTitleTone,
} from './overlay/StatusSheet';

// Expo UI input with React Native drawing
export { OtpInput, type OtpInputProps, type OtpInputHandle } from './form/OtpInput';
export { PasswordRules, type PasswordRulesProps, type PasswordRule } from './form/PasswordRules';
export { CheckboxRow, type CheckboxRowProps } from './form/CheckboxRow';

// React Native + NativeWind + Reanimated
export { Text, type TextProps, type TextVariant, type TextTone } from './ui/Text';
export { ImageCarousel, type ImageCarouselProps, type CarouselImage } from './media/ImageCarousel';
export { RoundFlag } from './media/RoundFlag';
export { PaginationDots, type PaginationDotsProps } from './ui/PaginationDots';
export { Screen, type ScreenProps, type ScreenEdge } from './layout/Screen';
export { KeyboardStickyBar } from './layout/KeyboardStickyBar';
export { PhotoViewer, type PhotoViewerProps } from './media/PhotoViewer';
export { PillRows, type PillRowsProps } from './layout/PillRows';
export { LoadFailedState, type LoadFailedStateProps } from './display/LoadFailedState';
export { NoConnectionArt, ServerDownArt } from './display/FailureArt';
export { GlassSurface, type GlassSurfaceProps } from './surface/GlassSurface';
export { EdgeFade } from './surface/EdgeFade';
export { BlurTarget, ProgressiveBlur, progressiveBlurAvailable } from './surface/ProgressiveBlur';
export { Pager, type PagerProps } from './layout/Pager';
export { SortableGrid, type SortableGridProps } from './layout/SortableGrid';
export { ScrollRow } from './layout/ScrollRow';
export { CenteredHeader } from './layout/CenteredHeader';
export { BackButton, BACK_BUTTON_SIZE, type BackButtonProps } from './navigation/BackButton';
export { Avatar, AvatarStack, type AvatarProps } from './display/Avatar';
export { EmptyState, type EmptyStateProps } from './display/EmptyState';
export { NoteCard } from './display/NoteCard';
export { Tag, type TagTone } from './display/Tag';
export { ListGroup, ListRow, type ListRowProps } from './list/ListGroup';
export { UnderlineTabs, SegmentedControl } from './navigation/Tabs';
export { PostCard, type PostCardModel } from './post/PostCard';
export { formatCardDate, formatCardTime, formatDistance } from './post/formatPost';
export { SwirlPattern, type SwirlPatternProps } from './brand/SwirlPattern';
export { StepProgress, type StepProgressProps, type StepProgressTone } from './feedback/StepProgress';

// Reanimated
export { ProgressReveal, type ProgressRevealProps } from './motion/ProgressReveal';
export { enterRise, useListEntrance, ENTER_MS } from './motion/enter';
export { LoadingRing, type LoadingRingProps } from './feedback/LoadingRing';
export { Toast, type ToastProps } from './feedback/Toast';
export { SkeletonBlock, SkeletonPulse, type SkeletonBlockProps } from './feedback/Skeleton';
export { Sheet, type SheetProps } from './overlay/Sheet';
export { PillTabs, type PillColor, type PillTabsProps, type PillTabOption } from './navigation/PillTabs';
export { FloatingTabBar, type FloatingTabBarProps, type TabItem } from './navigation/FloatingTabBar';
export { CelebrationSheet, type CelebrationSheetProps } from './overlay/CelebrationSheet';
export { Logo, logoHeight, type LogoProps, type LogoTone } from './brand/Logo';

// Explore
export { Dialog, type DialogProps } from './overlay/Dialog';
export { MenuButton, type MenuAction, type MenuButtonProps } from './overlay/MenuButton';
