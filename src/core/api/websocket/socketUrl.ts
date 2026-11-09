/**
 * Where the live socket lives: its own host, not the API's (spec §2.20). The
 * dev socket is `https://dev-ws.ajalatrvl.com`, beside the dev API at
 * `https://dev-api.ajalatrvl.com`.
 *
 * `EXPO_PUBLIC_WS_URL` names it. Without it the host is guessed from the API's:
 * the "api" part of the first host label becomes "ws" (`dev-api` → `dev-ws`,
 * `api` → `ws`, `api-staging` → `ws-staging`). That guess is ours, not the
 * backend's: only the dev socket host is documented (spec §8 Q6), so every
 * other environment should set the variable. A host with no "api" label (a
 * local server) is used as it is.
 *
 * The `/chat` namespace is added by the caller; the bare host refuses every
 * connection.
 */
export function socketOrigin(configured: string | undefined, apiBaseUrl: string): string {
  const set = configured?.trim();
  // Taken whole, but without a trailing slash or a `/chat` someone added to it.
  if (set) return set.replace(/\/+$/, '').replace(/\/chat$/, '');
  const match = /^(https?:\/\/)([^/:?#]+)(:\d+)?/i.exec(apiBaseUrl.trim());
  if (!match) return apiBaseUrl.replace(/\/+$/, '');
  const [, scheme, host = '', port = ''] = match;
  const [first = '', ...rest] = host.split('.');
  const label =
    first === 'api'
      ? 'ws'
      : first.endsWith('-api')
        ? `${first.slice(0, -'-api'.length)}-ws`
        : first.startsWith('api-')
          ? `ws-${first.slice('api-'.length)}`
          : first;
  return `${scheme}${[label, ...rest].join('.')}${port}`;
}
