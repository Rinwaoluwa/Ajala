import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@shared/utils/cn';

/**
 * Typed text primitive.
 *
 * Every string in the app goes through a named step of the type scale, so nobody
 * hand-picks a font size. Variants map 1:1 to `typography.scale` in the token
 * contract — add a step there, not here.
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
  return (
    <RNText
      className={cn(variantClass[variant], toneClass[tone], className)}
      {...props}
    />
  );
}
