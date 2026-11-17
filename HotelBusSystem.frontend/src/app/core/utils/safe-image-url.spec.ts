import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeImageUrl, isAllowedImageUrl, DEFAULT_IMAGE_PLACEHOLDER, SafeImageUrlPipe } from './safe-image-url';
import { environment } from '../../../environments/environment';

describe('safeImageUrl and isAllowedImageUrl (Any HTTPS Host)', () => {
  let warnSpy: any;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should accept valid HTTPS URLs from Cloudflare R2', () => {
    const r2Url = `${environment.imagePublicBaseUrl}/hotels/1/gallery/photo1.webp`;
    expect(isAllowedImageUrl(r2Url)).toBe(true);
    expect(safeImageUrl(r2Url)).toBe(r2Url);
  });

  it('should accept valid HTTPS URLs from Unsplash with complex query parameters intact', () => {
    const unsplashUrl =
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
    expect(isAllowedImageUrl(unsplashUrl)).toBe(true);
    expect(safeImageUrl(unsplashUrl)).toBe(unsplashUrl);
  });

  it('should accept valid HTTPS URLs from any external host or CDN as-is', () => {
    const hosts = [
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://i.imgur.com/example.png',
      'https://s3.amazonaws.com/my-bucket/hotels/cover.jpg',
      'https://storage.googleapis.com/hotel-assets/suite-deluxe.webp',
      'https://cdn.my-custom-domain.org/photos/room-101.jpg',
    ];

    for (const url of hosts) {
      expect(isAllowedImageUrl(url)).toBe(true);
      expect(safeImageUrl(url)).toBe(url);
    }
  });

  it('should accept HTTPS URLs with standard port 443', () => {
    const port443Url = 'https://example.com:443/images/hotel.jpg';
    expect(isAllowedImageUrl(port443Url)).toBe(true);
    expect(safeImageUrl(port443Url)).toBe(port443Url);
  });

  it('should reject non-HTTPS URLs and return DEFAULT_IMAGE_PLACEHOLDER', () => {
    const httpUrls = [
      'http://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/photo.webp',
      'http://images.unsplash.com/photo-123.jpg',
      'http://example.com/hotel.png',
      'ftp://example.com/image.png',
    ];

    for (const url of httpUrls) {
      expect(isAllowedImageUrl(url)).toBe(false);
      expect(safeImageUrl(url)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    }
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should reject URLs with embedded credentials and return placeholder', () => {
    const credsUrl = 'https://admin:secret123@example.com/photo.jpg';
    expect(isAllowedImageUrl(credsUrl)).toBe(false);
    expect(safeImageUrl(credsUrl)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('contains credentials')
    );
  });

  it('should reject URLs with non-standard ports and return placeholder', () => {
    const badPortUrl = 'https://example.com:8443/photo.jpg';
    expect(isAllowedImageUrl(badPortUrl)).toBe(false);
    expect(safeImageUrl(badPortUrl)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('non-standard port (8443)')
    );
  });

  it('should reject URLs exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050);
    expect(isAllowedImageUrl(longUrl)).toBe(false);
    expect(safeImageUrl(longUrl)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('URL exceeds maximum length')
    );
  });

  it('should reject malformed URLs', () => {
    const malformedList = ['https://', 'just-a-string', '://no-protocol', 'javascript:alert(1)'];
    for (const item of malformedList) {
      expect(isAllowedImageUrl(item)).toBe(false);
      expect(safeImageUrl(item)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    }
  });

  it('should handle null, undefined, and empty string by returning the placeholder without warning spam', () => {
    warnSpy.mockClear();

    expect(isAllowedImageUrl(null)).toBe(false);
    expect(safeImageUrl(null)).toBe(DEFAULT_IMAGE_PLACEHOLDER);

    expect(isAllowedImageUrl(undefined)).toBe(false);
    expect(safeImageUrl(undefined)).toBe(DEFAULT_IMAGE_PLACEHOLDER);

    expect(isAllowedImageUrl('')).toBe(false);
    expect(safeImageUrl('')).toBe(DEFAULT_IMAGE_PLACEHOLDER);

    expect(isAllowedImageUrl('   ')).toBe(false);
    expect(safeImageUrl('   ')).toBe(DEFAULT_IMAGE_PLACEHOLDER);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should allow custom placeholder fallback when URL is invalid or empty', () => {
    const customPlaceholder = '/assets/images/custom-fallback.svg';
    expect(safeImageUrl(null, customPlaceholder)).toBe(customPlaceholder);
    expect(safeImageUrl('http://insecure.com/pic.jpg', customPlaceholder)).toBe(customPlaceholder);
    expect(safeImageUrl('invalid-url', customPlaceholder)).toBe(customPlaceholder);
  });

  it('should work correctly with SafeImageUrlPipe transform', () => {
    const pipe = new SafeImageUrlPipe();
    const validUrl = 'https://images.unsplash.com/photo-hotel-room.jpg?w=600';
    expect(pipe.transform(validUrl)).toBe(validUrl);
    expect(pipe.transform(null)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    expect(pipe.transform('http://bad-url.com/a.jpg', '/fallback.png')).toBe('/fallback.png');
  });
});
