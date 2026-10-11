/**
 * API Configuration and Production Diagnostics Helper for BirdVoice AI
 */

// Production API Base URL configured via VITE_API_URL environment variable.
// Defaults to empty string (relative paths) in development / same-origin hosting.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Constructs a fully-qualified API URL or relative path based on VITE_API_URL.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * Performs a health check request to confirm backend availability.
 */
export async function checkBackendHealth(): Promise<{ status: string; reachable: boolean; details?: any }> {
  const healthUrl = getApiUrl('/api/health');
  console.log(`[BirdVoice] Checking backend health at: ${healthUrl}`);
  try {
    const res = await fetch(healthUrl, { method: 'GET' });
    if (res.ok) {
      const details = await res.json().catch(() => ({}));
      console.log('[BirdVoice] Backend health check PASSED:', details);
      return { status: 'ok', reachable: true, details };
    } else {
      console.warn(`[BirdVoice] Backend health check returned HTTP ${res.status}`);
      return { status: `http_${res.status}`, reachable: false };
    }
  } catch (err: any) {
    console.error('[BirdVoice] Backend health check failed:', err.message || err);
    return { status: 'error', reachable: false, details: err.message };
  }
}
