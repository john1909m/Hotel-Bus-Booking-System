import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpRequest, HttpHandlerFn, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor, isBackendApiRequest } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('authInterceptor & isBackendApiRequest', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
    };
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('should identify backend API requests correctly', () => {
    expect(isBackendApiRequest(`${environment.apiBaseUrl}/hotels`)).toBe(true);
    expect(isBackendApiRequest(`${environment.apiBaseUrl}/images/upload-url`)).toBe(true);
    expect(isBackendApiRequest(`${environment.apiBaseUrl}`)).toBe(true);
  });

  it('should identify non-backend / external URLs and reject them', () => {
    // Cloudflare R2 direct URL
    expect(isBackendApiRequest('https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/pic.webp')).toBe(false);
    // Malicious or third-party domains
    expect(isBackendApiRequest('https://evil.com/api/hotels')).toBe(false);
    // Look-alike domain with backend port embedded in host
    expect(isBackendApiRequest('http://localhost:8080.attacker.com/api/hotels')).toBe(false);
    // Null/empty
    expect(isBackendApiRequest('')).toBe(false);
  });

  it('should attach withCredentials: true only to backend API requests', () => {
    const backendReq = new HttpRequest('GET', `${environment.apiBaseUrl}/hotels`);
    let interceptedReq: HttpRequest<unknown> | null = null;

    const nextFn: HttpHandlerFn = (req) => {
      interceptedReq = req;
      return of(new HttpResponse({ status: 200 }));
    };

    authInterceptor(backendReq, nextFn).subscribe();

    expect(interceptedReq).not.toBeNull();
    expect(interceptedReq!.withCredentials).toBe(true);
    expect(interceptedReq!.headers.get('Accept-Language')).toBe('en');
  });

  it('should attach Accept-Language: ar when Arabic is saved in localStorage', () => {
    localStorage.setItem('te-lang', 'ar');
    try {
      const backendReq = new HttpRequest('GET', `${environment.apiBaseUrl}/hotels`);
      let interceptedReq: HttpRequest<unknown> | null = null;

      const nextFn: HttpHandlerFn = (req) => {
        interceptedReq = req;
        return of(new HttpResponse({ status: 200 }));
      };

      authInterceptor(backendReq, nextFn).subscribe();

      expect(interceptedReq).not.toBeNull();
      expect(interceptedReq!.headers.get('Accept-Language')).toBe('ar');
    } finally {
      localStorage.removeItem('te-lang');
    }
  });

  it('should NOT attach withCredentials or Accept-Language to external/Cloudflare R2 requests and should strip Authorization header', () => {
    const r2Url = 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/photo.jpg';
    const reqWithAuth = new HttpRequest('PUT', r2Url, 'content', {
      headers: new HttpHeaders({ Authorization: 'Bearer secret-jwt-token' }),
    });

    let interceptedReq: HttpRequest<unknown> | null = null;

    const nextFn: HttpHandlerFn = (req) => {
      interceptedReq = req;
      return of(new HttpResponse({ status: 200 }));
    };

    authInterceptor(reqWithAuth, nextFn).subscribe();

    expect(interceptedReq).not.toBeNull();
    expect(interceptedReq!.withCredentials).toBe(false);
    expect(interceptedReq!.headers.has('Authorization')).toBe(false);
    expect(interceptedReq!.headers.has('Accept-Language')).toBe(false);
  });
});
