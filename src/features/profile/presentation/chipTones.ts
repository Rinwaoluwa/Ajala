import type { ChipTone } from '@shared/components';

/**
 * The colour a chip fills with when chosen. The design scatters teal, Marigold
 * and coral through each list; this keeps that look while giving every option a
 * colour of its own — derived from its label, so a chip never changes colour
 * because its neighbours did.
 */
const TONES: readonly ChipTone[] = ['teal', 'marigold', 'coral', 'teal'];

export function chipToneFor(key: string): ChipTone {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length] ?? 'teal';
}
