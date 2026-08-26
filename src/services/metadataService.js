const cheerio = require('cheerio');
const { assertSafeUrl } = require('../utils/urlSafety');

const FETCH_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB cap
const MAX_REDIRECTS = 3;

/**
 * Follows redirects manually (instead of fetch's automatic 'follow')
 * so every hop — not just the first URL — is re-checked against the
 * SSRF allowlist. A public URL that redirects to an internal IP is
 * a classic bypass otherwise.
 */
async function safeFetchFollowingRedirects(startUrl) {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(currentUrl); // re-validate this hop

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) return response;

    const location = response.headers.get('location');
    if (!location) return response;

    currentUrl = new URL(location, currentUrl).toString();
  }

  return null; // too many redirects
}

/**
 * Fetches and parses page metadata for a URL.
 * Returns { title, description, domain, favicon, image, siteName, canonicalUrl }
 */
async function fetchMetadata(rawUrl) {
  const parsed = await assertSafeUrl(rawUrl); // throws ApiError(400) if unsafe
  const domain = parsed.hostname.replace(/^www\./, '');

  const result = {
    url: parsed.toString(),
    title: null,
    description: null,
    domain,
    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    image: null,
    siteName: null,
    canonicalUrl: null,
  };

  try {
    const response = await safeFetchFollowingRedirects(parsed.toString());
    if (!response) return result;

    if (!response.ok) return result;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return result;

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > MAX_RESPONSE_BYTES) return result;

    const html = await response.text();
    const $ = cheerio.load(html.slice(0, MAX_RESPONSE_BYTES));

    const og = (prop) =>
      $(`meta[property="${prop}"]`).attr('content') || $(`meta[name="${prop}"]`).attr('content');
    const name = (n) => $(`meta[name="${n}"]`).attr('content');

    result.title =
      og('og:title') ||
      name('twitter:title') ||
      og('twitter:title') ||
      name('title') ||
      $('title').first().text()?.trim() ||
      null;

    result.description =
      og('og:description') ||
      name('twitter:description') ||
      og('twitter:description') ||
      name('description') ||
      null;

    let rawImg =
      og('og:image') ||
      og('og:image:secure_url') ||
      name('twitter:image') ||
      name('twitter:image:src') ||
      og('twitter:image') ||
      $('link[rel="image_src"]').attr('href') ||
      $('meta[itemprop="image"]').attr('content') ||
      null;

    if (rawImg) {
      try {
        result.image = new URL(rawImg, parsed.origin).toString();
      } catch {
        result.image = rawImg.startsWith('http') ? rawImg : null;
      }
    }

    result.siteName = og('og:site_name') || null;
    result.canonicalUrl = $('link[rel="canonical"]').attr('href') || null;

    const iconHref =
      $('link[rel="apple-touch-icon"]').attr('href') ||
      $('link[rel="apple-touch-icon-precomposed"]').attr('href') ||
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href');

    if (iconHref && !iconHref.startsWith('data:')) {
      try {
        const resolved = new URL(iconHref, parsed.origin).toString();
        if (resolved.startsWith('http')) {
          result.favicon = resolved;
        }
      } catch {
        /* keep default favicon fallback */
      }
    }
  } catch (err) {
    // Continue with defaults
  }

  // If no title found from HTML, derive clean readable title from URL path/domain
  if (!result.title) {
    try {
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const last = decodeURIComponent(pathSegments[pathSegments.length - 1])
          .replace(/[-_+]/g, ' ')
          .replace(/\.(html|php|asp|jsp)$/i, '')
          .trim();
        if (last && last.length > 1) {
          result.title = last
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }
      }
    } catch {
      /* ignore */
    }

    if (!result.title) {
      result.title = domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }

  return result;
}

module.exports = { fetchMetadata, MAX_REDIRECTS };
