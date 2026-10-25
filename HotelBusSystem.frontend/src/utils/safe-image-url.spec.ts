import { describe, it, expect } from 'vitest';
import { safeImageUrl, isAllowedImageUrl, DEFAULT_IMAGE_PLACEHOLDER, SafeImageUrlPipe } from './safe-image-url';
import { environment } from '../environments/environment';

describe('safeImageUrl and isAllowedImageUrl', () => {
  const allowedBase = environment.imagePublicBaseUrl; // 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev'

  it('should accept valid HTTPS URLs matching the configured Cloudflare R2 origin', () => {
    const validUrl = `${allowedBase}/hotels/1/gallery/photo1.webp`;
    expect(isAllowedImageUrl(validUrl)).toBe(true);
    expect(safeImageUrl(validUrl)).toBe(validUrl);
  });

  it('should reject non-HTTPS URLs', () => {
    const httpUrl = `http://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/gallery/photo.webp`;
    expect(isAllowedImageUrl(httpUrl)).toBe(false);
    expect(safeImageUrl(httpUrl)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
  });

  it('should reject URLs with different hostnames', () => {
    const evilUrl = 'https://malicious-site.com/hotels/1/photo.jpg';
    expect(isAllowedImageUrl(evilUrl)).toBe(false);
    expect(safeImageUrl(evilUrl)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
  });

  it('should reject URLs with embedded credentials', () => {
    const credsUrl = 'https://admin:pass@pub-e3f67119581e41a09e34c0a920c52720.r2.dev/photo.jpg';
    expect(isAllowedImageUrl(credsUrl)).toBe(false);
    expect(safeImageUrl(credsUrl)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
  });

  it('should reject URLs with unexpected ports', () => {
    const portUrl = 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev:8443/photo.jpg';
    expect(isAllowedImageUrl(portUrl)).toBe(false);
    expect(safeImageUrl(portUrl)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
  });

  it('should handle null, undefined, and empty string by returning the placeholder', () => {
    expect(isAllowedImageUrl(null)).toBe(false);
    expect(safeImageUrl(null)).toBe(DEFAULT_IMAGE_PLACEHOLDER);

    expect(isAllowedImageUrl(undefined)).toBe(false);
    expect(safeImageUrl(undefined)).toBe(DEFAULT_IMAGE_PLACEHOLDER);

    expect(isAllowedImageUrl('')).toBe(false);
    expect(safeImageUrl('')).toBe(DEFAULT_IMAGE_PLACEHOLDER);

    expect(isAllowedImageUrl('   ')).toBe(false);
    expect(safeImageUrl('   ')).toBe(DEFAULT_IMAGE_PLACEHOLDER);
  });

  it('should allow custom placeholder fallback', () => {
    const customPlaceholder = '/assets/images/custom-fallback.svg';
    expect(safeImageUrl(null, customPlaceholder)).toBe(customPlaceholder);
    expect(safeImageUrl('invalid-url', customPlaceholder)).toBe(customPlaceholder);
  });

  it('should work correctly with SafeImageUrlPipe transform', () => {
    const pipe = new SafeImageUrlPipe();
    const validUrl = `${allowedBase}/hotels/1/photo.png`;
    expect(pipe.transform(validUrl)).toBe(validUrl);
    expect(pipe.transform(null)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    expect(pipe.transform('bad-url', '/fallback.png')).toBe('/fallback.png');
  });

  it('should accept legitimate Cloudflare R2 public bucket URLs (*.r2.dev)', () => {
    const apiPublicUrl =
      'https://pub-9188aaa3f1d74a5ca857aecc65c7c25f.r2.dev/hotels/1/gallery/e4126a7c-b25b-4e61-b1b9-8489b85be637.jpg';
    expect(isAllowedImageUrl(apiPublicUrl)).toBe(true);
    expect(safeImageUrl(apiPublicUrl)).toBe(apiPublicUrl);
  });
});
