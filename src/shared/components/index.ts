/**
 * Public surface of the shared component library.
 *
 * Features import from `@shared/components`, never from a file inside it.
 * See docs/COMPONENTS.md for the Expo UI / React Native split.
 */

// Expo UI — native controls
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './ui/Button';

// React Native + NativeWind + Reanimated
export { Text, type TextProps, type TextVariant, type TextTone } from './ui/Text';
export { ImageCarousel, type ImageCarouselProps, type CarouselImage } from './media/ImageCarousel';
export { PaginationDots, type PaginationDotsProps } from './ui/PaginationDots';
export { Screen, type ScreenProps, type ScreenEdge } from './layout/Screen';

// Reanimated
export { Reveal, type RevealProps } from './motion/Reveal';
export { ProgressBar, type ProgressBarProps } from './feedback/ProgressBar';
export { Logo, type LogoProps } from './brand/Logo';
