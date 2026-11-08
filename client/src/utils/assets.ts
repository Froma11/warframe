/**
 * Resolves item/weapon asset URLs to route through the local fast VPS cache proxy (/api/assets/*)
 * This eliminates broken images, avoids CORS/CORP cross-origin blocking, and speeds up loading.
 */
export const resolveAssetUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('/api/assets/')) return url;
  if (url.startsWith('https://warframe.market/static/assets/')) {
    return url.replace('https://warframe.market/static/assets/', '/api/assets/');
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const clean = url.startsWith('/') ? url.slice(1) : url;
  return `/api/assets/${clean}`;
};
