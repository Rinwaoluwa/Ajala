import * as Crypto from 'expo-crypto';

/**
 * A one-time value that ties a provider's token to this sign-in attempt.
 *
 * The provider SDK is given the nonce (Apple wants its SHA-256) and writes it
 * into the token it signs; the API is sent the raw value and checks the two
 * match, then refuses to see it again. A token lifted from somewhere else, or
 * replayed, fails that check.
 *
 * 32 random bytes as hex: well over the API's 16-character minimum.
 */
export type Nonce = { raw: string; sha256: string };

export async function createNonce(): Promise<Nonce> {
  const bytes = Crypto.getRandomBytes(32);
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const sha256 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, sha256 };
}
