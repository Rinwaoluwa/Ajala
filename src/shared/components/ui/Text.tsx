import { Text as RNText, useWindowDimensions, type TextProps as RNTextProps } from 'react-native';

import { MAX_HEADING_SCALE, MAX_TEXT_SCALE } from '@shared/hooks/useFontScale';
import { cn } from '@shared/utils/cn';

/**
 * Typed text primitive.
 *
 * Every string in the app goes through a named step of the type scale, so nobody
 * hand-picks a font size. Variants map 1:1 to `typography.scale` in the token
 * contract — add a step there, not here.
 *
 * Text follows the person's text-size setting, up to a ceiling per step (see
 * `useFontScale`): large headings grow least, so a single long word still fits
 * the width; body text grows most, because that is what people need to read.
 */

export type TextVariant =
  | 'display'
  | 'headingXxl'
  | 'headingXl'
  | 'headingLg'
  | 'headingMd'
  | 'headingSm'
  | 'bodyLg'
  | 'bodyMd'
  | 'bodySm'
  | 'labelMd'
  | 'labelSm'
  | 'labelXs'
  | 'bodyXs'
  | 'code';

export type TextTone =
  | 'default'
  | 'muted'
  | 'heading'
  | 'link'
  | 'placeholder'
  | 'primary'
  | 'onPrimary'
  | 'onCta'
  | 'accent'
  | 'success'
  | 'destructive';

/**
 * Lookup maps rather than conditionals: adding a variant is one entry, and the
 * compiler catches a missing one.
 */
const variantClass: Record<TextVariant, string> = {
  display: 'font-display text-display',
  headingXxl: 'font-heading text-headingXxl',
  headingXl: 'font-heading text-headingXl',
  headingLg: 'font-heading text-headingLg',
  headingMd: 'font-heading text-headingMd',
  headingSm: 'font-heading text-headingSm',
  bodyLg: 'font-body text-bodyLg',
  bodyMd: 'font-body text-bodyMd',
  bodySm: 'font-body text-bodySm',
  labelMd: 'font-body-medium text-labelMd',
  labelSm: 'font-body-medium text-labelSm',
  labelXs: 'font-body-medium text-labelXs',
  bodyXs: 'font-body text-bodyXs',
  code: 'font-body text-code',
};

/** How far each step may grow with the text-size setting. */
const maxScale: Record<TextVariant, number> = {
  display: MAX_HEADING_SCALE,
  headingXxl: MAX_HEADING_SCALE,
  headingXl: MAX_HEADING_SCALE,
  headingLg: MAX_HEADING_SCALE,
  // Smaller headings sit in bars and rows beside other things; half again is room enough.
  headingMd: 1.5,
  headingSm: 1.5,
  bodyLg: MAX_TEXT_SCALE,
  bodyMd: MAX_TEXT_SCALE,
  bodySm: MAX_TEXT_SCALE,
  labelMd: MAX_TEXT_SCALE,
  labelSm: MAX_TEXT_SCALE,
  labelXs: MAX_TEXT_SCALE,
  bodyXs: MAX_TEXT_SCALE,
  // A code digit sits in a fixed-size box, six to a row.
  code: MAX_HEADING_SCALE,
};

const toneClass: Record<TextTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted',
  heading: 'text-heading',
  link: 'text-link',
  placeholder: 'text-placeholder',
  primary: 'text-primary',
  onPrimary: 'text-primary-foreground',
  onCta: 'text-cta-foreground',
  accent: 'text-accent',
  success: 'text-success',
  destructive: 'text-destructive',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
};

export function Text({
  variant = 'bodyMd',
  tone = 'default',
  className,
  ...props
}: TextProps) {
  // React Native keeps a mounted text's measured size when the text-size setting
  // changes while the app is open, so a screen already on display would clip its
  // text (or leave gaps) until it re-rendered for some other reason. Keying on the
  // scale has the text measured afresh at the new size; it changes only when the
  // setting does.
  const { fontScale } = useWindowDimensions();

  return (
    <RNText
      key={fontScale}
      className={cn(variantClass[variant], toneClass[tone], className)}
      maxFontSizeMultiplier={maxScale[variant]}
      {...props}
    />
  );
}
