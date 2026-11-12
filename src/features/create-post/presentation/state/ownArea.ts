import { createContext, useContext } from 'react';

/**
 * Whether the place pickers offer only places in the host's own area (MOB-077).
 * A free member may only post near where they are: the server answers 402
 * "Posting outside your area needs a subscription" for anywhere else. So their
 * search shows only places around the phone, and they never pick one the
 * server will refuse. Pro members search anywhere. The wizard sets it.
 */
export const OwnAreaOnlyContext = createContext(false);

export const useOwnAreaOnly = () => useContext(OwnAreaOnlyContext);
