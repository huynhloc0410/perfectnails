'use client';

import { useEffect, useState } from 'react';
import { fetchCmsSite, type CmsSiteApiResponse } from '@/lib/cms/site-client';

export type CmsSiteFetchState =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: CmsSiteApiResponse; error: undefined }
  | { status: 'error'; data: undefined; error: unknown };

/**
 * Loads `/api/cms/site` once on mount (public CMS bundle).
 * Prefer this for simple widgets; pages with localStorage fallbacks may still use `fetchCmsSite` inline.
 */
export function useCmsSite(): CmsSiteFetchState {
  const [state, setState] = useState<CmsSiteFetchState>({ status: 'loading', data: undefined, error: undefined });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (!cancelled) setState({ status: 'success', data, error: undefined });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', data: undefined, error: e });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
