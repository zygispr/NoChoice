/** Mirrors the manifest's `content_scripts.matches`. `aliexpress.ru` is out of scope (FR-018). */
const SUPPORTED_DOMAINS = ['aliexpress.com', 'aliexpress.us'];

export function isSupportedAliExpressUrl(url: string | undefined): boolean {
  if (url === undefined || !URL.canParse(url)) return false;
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'https:' && protocol !== 'http:') return false;
  return SUPPORTED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}
