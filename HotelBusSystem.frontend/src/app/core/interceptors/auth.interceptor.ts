import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Validates whether the given URL matches the exact configured backend API origin and base path.
 * Protects against credential leakage to third-party endpoints or storage origins (e.g. Cloudflare R2).
 */
export function isBackendApiRequest(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const base = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';

    const targetUrl = new URL(url, base);
    const apiUrl = new URL(environment.apiBaseUrl, base);

    // Origin (protocol, hostname, and port) must match exactly
    if (targetUrl.origin !== apiUrl.origin) {
      return false;
    }

    // Pathname must begin with the configured API path prefix
    const apiPathname = apiUrl.pathname.endsWith('/')
      ? apiUrl.pathname.slice(0, -1)
      : apiUrl.pathname;

    return targetUrl.pathname === apiPathname || targetUrl.pathname.startsWith(`${apiPathname}/`);
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach withCredentials and backend auth to requests targeting the exact backend origin
  if (isBackendApiRequest(req.url)) {
    const clonedRequest = req.clone({
      withCredentials: true,
    });
    return next(clonedRequest);
  }

  // External requests (e.g. Cloudflare R2 direct uploads) must not receive cookies or auth headers
  let cleanRequest = req;
  if (req.headers.has('Authorization')) {
    cleanRequest = req.clone({
      headers: req.headers.delete('Authorization'),
    });
  }

  return next(cleanRequest);
};

