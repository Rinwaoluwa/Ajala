import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatKeys } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';

/** "Keep chats on Ajala" — shown until closed on this phone. */
export function useSafetyBanner() {
  const { safetyBanner } = useChatUseCases();
  const queryClient = useQueryClient();
  const dismissed = useQuery({
    queryKey: chatKeys.safetyBanner,
    queryFn: () => safetyBanner.isDismissed(),
    staleTime: Infinity,
  });
  const close = useMutation({
    mutationFn: () => safetyBanner.dismiss(),
    onMutate: () => queryClient.setQueryData(chatKeys.safetyBanner, true),
  });
  return { visible: dismissed.data === false, dismiss: () => close.mutate() };
}
