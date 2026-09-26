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
export { TextLink, type TextLinkProps } from './ui/TextLink';
export { NativeIcon, type NativeIconProps, type NativeIconSource } from './ui/NativeIcon';
export { icons } from './ui/icons';
export { TextField, type TextFieldProps } from './form/TextField';
export { PasswordField, type PasswordFieldProps } from './form/PasswordField';
export { SelectField, type SelectFieldProps } from './form/SelectField';
export { ScreenHeader, type ScreenHeaderProps } from './layout/ScreenHeader';
export { DatePickerSheet, type DatePickerSheetProps } from './overlay/DatePickerSheet';
export { StatusSheet, type StatusSheetProps } from './overlay/StatusSheet';

// Expo UI input with React Native drawing
export { OtpInput, type OtpInputProps, type OtpInputHandle } from './form/OtpInput';
export { PasswordRules, type PasswordRulesProps, type PasswordRule } from './form/PasswordRules';

// React Native + NativeWind + Reanimated
export { Text, type TextProps, type TextVariant, type TextTone } from './ui/Text';
export { ImageCarousel, type ImageCarouselProps, type CarouselImage } from './media/ImageCarousel';
export { PaginationDots, type PaginationDotsProps } from './ui/PaginationDots';
export { Screen, type ScreenProps, type ScreenEdge } from './layout/Screen';
export { StepProgress, type StepProgressProps } from './feedback/StepProgress';

// Reanimated
export { ProgressReveal, type ProgressRevealProps } from './motion/ProgressReveal';
export { ProgressBar, type ProgressBarProps } from './feedback/ProgressBar';
export { Logo, type LogoProps } from './brand/Logo';
