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
export {
  TextLink,
  type TextLinkProps,
  type TextLinkTone,
  type TextLinkEmphasis,
} from './ui/TextLink';
export { NativeIcon, type NativeIconProps, type NativeIconSource } from './ui/NativeIcon';
export { icons } from './ui/icons';
export { NativeSpinner, type NativeSpinnerProps } from './ui/NativeSpinner';
export { SvgIcon, type SvgIconName, type SvgIconProps } from './ui/SvgIcon';
export { VectorIcon, type VectorIconName, type VectorIconProps } from './ui/VectorIcon';
export { Illustration, type IllustrationName } from './ui/Illustration';
export { TextField, type TextFieldProps, type TrailingAction } from './form/TextField';
export { PasswordField, type PasswordFieldProps } from './form/PasswordField';
export { SelectField, type SelectFieldProps } from './form/SelectField';
export { Chip, ChipGroup, type ChipProps, type ChipGroupProps, type ChipTone } from './form/Chip';
export {
  ScreenHeader,
  SCREEN_HEADER_HEIGHT,
  type ScreenHeaderProps,
} from './layout/ScreenHeader';
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

// React Native + NativeWind + Reanimated
export { Text, type TextProps, type TextVariant, type TextTone } from './ui/Text';
export { ImageCarousel, type ImageCarouselProps, type CarouselImage } from './media/ImageCarousel';
export { RoundFlag } from './media/RoundFlag';
export { PaginationDots, type PaginationDotsProps } from './ui/PaginationDots';
export { Screen, type ScreenProps, type ScreenEdge } from './layout/Screen';
export { Pager, type PagerProps } from './layout/Pager';
export { PlaceholderScreen } from './layout/PlaceholderScreen';
export { PostCard, type PostCardModel } from './post/PostCard';
export { formatCardDate, formatCardTime, formatDistance } from './post/formatPost';
export { SwirlPattern, type SwirlPatternProps } from './brand/SwirlPattern';
export {
  StepProgress,
  type StepProgressProps,
  type StepProgressTone,
} from './feedback/StepProgress';

// Reanimated
export { ProgressReveal, type ProgressRevealProps } from './motion/ProgressReveal';
export { enterRise, ENTER_MS } from './motion/enter';
export { ProgressBar, type ProgressBarProps } from './feedback/ProgressBar';
export { LoadingRing, type LoadingRingProps } from './feedback/LoadingRing';
export { SkeletonBlock, SkeletonPulse, type SkeletonBlockProps } from './feedback/Skeleton';
export { Sheet, type SheetProps } from './overlay/Sheet';
export {
  FloatingTabBar,
  type FloatingTabBarProps,
  type TabItem,
} from './navigation/FloatingTabBar';
export { CelebrationSheet, type CelebrationSheetProps } from './overlay/CelebrationSheet';
export { Logo, logoHeight, type LogoProps, type LogoTone } from './brand/Logo';
