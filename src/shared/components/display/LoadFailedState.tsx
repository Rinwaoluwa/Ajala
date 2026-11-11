import { EmptyState, type EmptyStateProps } from './EmptyState';
import { NoConnectionArt, ServerDownArt } from './FailureArt';

/**
 * A screen or section that could not load: the picture says which kind of
 * failure it was — the broken charger for no connection, the cracked cloud
 * when the server did not answer — over the caller's heading, line and retry.
 */
export type LoadFailedStateProps = Omit<EmptyStateProps, 'art'> & {
  /** `network`: the request never got an answer. Anything else is the server's fault. */
  kind: 'network' | 'server';
};

export function LoadFailedState({ kind, ...props }: LoadFailedStateProps) {
  return <EmptyState art={kind === 'network' ? <NoConnectionArt /> : <ServerDownArt />} {...props} />;
}
