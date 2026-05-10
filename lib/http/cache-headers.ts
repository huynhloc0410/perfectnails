/** Standard headers for authenticated or user-specific JSON that must not be CDN-cached. */
export const CACHE_HEADERS_PRIVATE_NO_STORE = {
  'Cache-Control': 'private, no-store',
} as const;
