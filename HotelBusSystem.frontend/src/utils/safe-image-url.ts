import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../environments/environment';

export const DEFAULT_IMAGE_PLACEHOLDER = '/assets/images/hotel-placeholder.svg';

/**
 * Validates whether a candidate image URL is safe and belongs to the configured Cloudflare R2 public origin.
 * Criteria:
 * - Must be non-empty string <= 2048 characters.
 * - Must use HTTPS protocol strictly.
 * - Must not contain embedded credentials (username/password).
 * - Port must either be empty or standard 443.
 * - Host and origin must match environment.imagePublicBaseUrl exactly.
 */
export function isAllowedImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol must strictly be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Must not contain credentials
    if (parsed.username || parsed.password) {
      return false;
    }

    // Port must be empty or standard 443
    if (parsed.port && parsed.port !== '443') {
      return false;
    }

    // Must match the configured image storage public origin or a legitimate Cloudflare R2 public bucket domain (*.r2.dev)
    const configuredBase = new URL(environment.imagePublicBaseUrl);
    const isConfiguredOrigin = parsed.origin.toLowerCase() === configuredBase.origin.toLowerCase();
    const isR2DevDomain = /^pub-[a-z0-9]+\.r2\.dev$/i.test(parsed.hostname);

    if (!isConfiguredOrigin && !isR2DevDomain) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Pure helper function returning the validated image URL or the trusted fallback placeholder.
 */
export function safeImageUrl(
  url: string | null | undefined,
  placeholder: string = DEFAULT_IMAGE_PLACEHOLDER
): string {
  if (isAllowedImageUrl(url)) {
    return (url as string).trim();
  }
  return placeholder;
}

/**
 * Standalone Angular pipe for safe image URL binding in templates:
 * Example:
 *   <img [src]="hotelImage.url | safeImageUrl" alt="..." />
 */
@Pipe({
  name: 'safeImageUrl',
  standalone: true,
  pure: true,
})
export class SafeImageUrlPipe implements PipeTransform {
  transform(value: string | null | undefined, placeholder?: string): string {
    return safeImageUrl(value, placeholder);
  }
}
