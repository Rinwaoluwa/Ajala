import { useEffect, useState } from 'react';

import { StatusSheet } from '@shared/components';

import type { ReportReasonKey } from '../../domain/rules/exploreRules';
import { exploreCopy } from '../copy';
import { useReportPost } from '../hooks/useReportPost';
import { ReportActivityDialog } from './ReportActivityDialog';

/**
 * "Report activity" as one piece, for screens outside Explore (the post page):
 * the reasons dialog, the call, and the "thanks" sheet after it.
 * `postId` non-null opens it; `onClose` runs when it is done or dismissed.
 */
export function ReportPostFlow({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const report = useReportPost();
  const [sent, setSent] = useState(false);
  const { reset } = report;

  useEffect(() => {
    if (postId) reset();
  }, [postId, reset]);

  const submit = async (keys: ReportReasonKey[], details: string) => {
    if (!postId) return;
    try {
      await report.submit({ postId, keys, details });
      onClose();
      setSent(true);
    } catch {
      // Shown under the details box by `report.error`.
    }
  };

  return (
    <>
      <ReportActivityDialog
        isPresented={postId !== null}
        submitting={report.submitting}
        error={report.error}
        onSubmit={(keys, details) => void submit(keys, details)}
        onDismiss={onClose}
      />
      <StatusSheet
        isPresented={sent}
        tone="success"
        title={exploreCopy.report.sentTitle}
        message={exploreCopy.report.sentBody}
        actionLabel={exploreCopy.report.sentAction}
        onAction={() => setSent(false)}
        onDismiss={() => setSent(false)}
      />
    </>
  );
}
