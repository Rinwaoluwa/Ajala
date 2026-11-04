/**
 * The glass behind a `GlassSurface`'s content. iOS draws it with SwiftUI
 * (`GlassBackdrop.ios.tsx`); elsewhere there is no Liquid Glass and the
 * surface uses its solid colour, so this draws nothing.
 */
export type GlassBackdropProps = {
  variant: 'clear' | 'regular';
  tint: string | null;
  /** Corner radius, or `capsule` for a pill or circle. */
  shape: { capsule: true } | { capsule: false; radius: number };
  appearance: 'auto' | 'light' | 'dark';
};

export function GlassBackdrop(_props: GlassBackdropProps) {
  return null;
}
