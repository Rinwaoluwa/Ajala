import Constants from 'expo-constants';

/**
 * Which flavour of the app this is. The normal app ("Ajala") talks to the
 * servers its build was given (`EXPO_PUBLIC_API_URL` and the rest). The dev
 * flavour ("Ajala Dev", `APP_VARIANT=dev`, a separate app on the phone) always
 * talks to the dev servers: they are written into its config (`extra.servers`
 * in app.config.js) and win over the compiled-in addresses, so an update
 * published from any environment can never point it elsewhere.
 */
export type FlavourServers = { api: string; ws: string; linksHost: string };

type FlavourExtra = {
  appVariant?: string;
  servers?: Partial<FlavourServers>;
  googleIosClientId?: string;
};

function extra(): FlavourExtra {
  try {
    return (Constants.expoConfig?.extra ?? {}) as FlavourExtra;
  } catch {
    return {};
  }
}

/** True in the "Ajala Dev" app. */
export const isDevFlavour = extra().appVariant === 'dev';

/** The flavour's own servers, when it has them; nothing for the normal app. */
export function flavourServers(): Partial<FlavourServers> {
  const servers = extra().servers;
  return servers && typeof servers === 'object' ? servers : {};
}

/** The flavour's own Google Sign-In iOS client (the dev app has its own bundle id). */
export function flavourGoogleIosClientId(): string | undefined {
  const id = extra().googleIosClientId;
  return typeof id === 'string' && id ? id : undefined;
}
