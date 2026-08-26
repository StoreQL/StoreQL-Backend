const dns = require('dns').promises;
const net = require('net');
const ApiError = require('./ApiError');

/**
 * Blocks metadata fetches from hitting internal infrastructure.
 * Checks both the literal hostname AND the resolved IP, so a
 * DNS-rebinding attempt (nice-domain.com -> 127.0.0.1) is caught.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local / cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — recheck as IPv4
    return isPrivateIPv4(lower.replace('::ffff:', ''));
  }
  return false;
}

function isPrivateIP(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // unknown format — fail closed
}

/**
 * Validates a URL is safe to fetch server-side.
 * Throws ApiError(400) if not. Returns the parsed URL on success.
 */
async function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw ApiError.badRequest('Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw ApiError.badRequest('Only http/https URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw ApiError.badRequest('This URL cannot be fetched');
  }

  // If the hostname is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw ApiError.badRequest('This URL cannot be fetched');
    }
    return parsed;
  }

  // Resolve DNS and check every returned address.
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw ApiError.badRequest('Could not resolve URL host');
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateIP(a.address))) {
    throw ApiError.badRequest('This URL cannot be fetched');
  }

  return parsed;
}

module.exports = { assertSafeUrl, isPrivateIP };
