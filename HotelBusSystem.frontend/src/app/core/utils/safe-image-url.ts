import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

export const DEFAULT_IMAGE_PLACEHOLDER = '/assets/images/imgPlaceHolder.jpg';

/**
 * Validates whether a candidate image URL is safe to render.
 * The URL stored in the database is rendered as-is (any host), provided:
 * - Must be non-empty string <= 2048 characters.
 * - Must strictly use the HTTPS protocol.
 * - Must not contain embedded credentials (username/password).
 * - Port must either be empty or standard 443.
 *
 * URLs failing validation are rejected and fall back to DEFAULT_IMAGE_PLACEHOLDER.
 * In development mode (!environment.production), rejection reasons are logged to console.warn.
 */
export function isAllowedImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.length > 2048) {
    if (!environment.production) {
      console.warn(`[safeImageUrl] Rejected: URL exceeds maximum length (2048 characters). Length: ${trimmed.length}`);
    }
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol must strictly be HTTPS
    if (parsed.protocol !== 'https:') {
      if (!environment.production) {
        console.warn(`[safeImageUrl] Rejected: not HTTPS (${parsed.protocol}) for URL: ${trimmed}`);
      }
      return false;
    }

    // Must not contain credentials
    if (parsed.username || parsed.password) {
      if (!environment.production) {
        console.warn(`[safeImageUrl] Rejected: contains credentials for URL: ${trimmed}`);
      }
      return false;
    }

    // Port must be empty or standard 443
    if (parsed.port && parsed.port !== '443') {
      if (!environment.production) {
        console.warn(`[safeImageUrl] Rejected: non-standard port (${parsed.port}) for URL: ${trimmed}`);
      }
      return false;
    }

    return true;
  } catch (err: any) {
    if (!environment.production) {
      console.warn(`[safeImageUrl] Rejected: malformed URL for input "${trimmed}"`, err?.message ?? err);
    }
    return false;
  }
}

/**
 * Pure helper function returning the validated image URL as-is or the trusted fallback placeholder.
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
