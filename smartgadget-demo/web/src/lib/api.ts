import { DemoHttpError, handle } from './demo/server';

/**
 * Demonstration mode — every request is answered in the browser by
 * `./demo/server` and nothing leaves the tab.
 *
 * On by default in this repository, because this repository IS the demo. Set
 * VITE_DEMO=false at build time to point the same UI at a real Worker.
 *
 * This is what makes the passwordless admin safe: with no server to reach,
 * "logging in" grants access to a dataset that already shipped inside the
 * page. There is no customer record, no API key and no order behind it.
 */
export const DEMO = import.meta.env.VITE_DEMO !== 'false';

/**
 * Base URL of the Worker API, injected at build time by the deploy workflow.
 *
 * No fallback address, on purpose. This repository is the demo: an API host
 * baked into its source is a real endpoint shipped to strangers, one edit away
 * from pointing a password-free admin dashboard at a live database. Empty
 * means requests are same-origin, which is right behind a proxy and harmless
 * here, where nothing reaches the network at all.
 *
 * Running the UI against a local Worker (VITE_DEMO=false) means setting
 * VITE_API_BASE yourself — an unset value should fail visibly rather than
 * quietly aim at a port that may belong to something else.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

const TOKEN_KEY = 'ag.admin.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing — session stays in memory only */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the staff token. */
  auth?: boolean;
  /** Send the customer token. Both are Bearer tokens but never interchangeable. */
  customerAuth?: boolean;
  signal?: AbortSignal;
}

const CUSTOMER_TOKEN_KEY = 'ag.customer.token';

function customerToken(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, customerAuth = false, signal } = options;

  if (DEMO) {
    try {
      return (await handle(method, path, body as Record<string, unknown> | undefined)) as T;
    } catch (err) {
      if (err instanceof DemoHttpError) throw new ApiError(err.message, err.status);
      throw new ApiError(err instanceof Error ? err.message : 'Request failed', 500);
    }
  }

  const headers: Record<string, string> = {};

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (customerAuth) {
    const token = customerToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the store. Check your connection and try again.', 0);
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`;

    // A dead session should not leave a stale token behind.
    if (res.status === 401 && auth) setToken(null);
    if (res.status === 401 && customerAuth) {
      try {
        localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    throw new ApiError(message, res.status);
  }

  return payload as T;
}

export interface UploadedImage {
  url: string;
  key: string;
}

/**
 * Multipart upload — bypasses the JSON body path above.
 *
 * Takes the whole selection in one request, because staff pick a product's
 * photos together and one failed file should stop the set rather than leave
 * some uploaded and some not.
 */
export async function uploadImages(files: File[]): Promise<UploadedImage[]> {
  if (!files.length) return [];

  if (DEMO) {
    // Read the picked file into a data URI. The admin's image controls then
    // behave exactly as they do in production — pick, see it, save it — while
    // the bytes never leave the browser, which is the only honest way to offer
    // an upload button on a site with no storage behind it.
    return Promise.all(
      files.map(
        (file) =>
          new Promise<UploadedImage>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ url: String(reader.result), key: `demo/${file.name}` });
            reader.onerror = () => reject(new ApiError('Could not read that file', 0));
            reader.readAsDataURL(file);
          }),
      ),
    );
  }

  const form = new FormData();
  for (const file of files) form.append('file', file);

  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/admin/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new ApiError('Could not reach the store to upload. Check your connection and try again.', 0);
  }

  const payload = (await res.json().catch(() => null)) as
    | { files?: UploadedImage[]; url?: string; key?: string; error?: string }
    | null;

  if (!res.ok) throw new ApiError(payload?.error ?? 'Upload failed', res.status);

  // Older Workers answered with a single url/key; accept both shapes so a
  // dashboard that is ahead of the deployed API still uploads one at a time.
  if (payload?.files?.length) return payload.files;
  if (payload?.url) return [{ url: payload.url, key: payload.key ?? '' }];
  throw new ApiError('Upload failed', res.status);
}

/** Single-file convenience wrapper over {@link uploadImages}. */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const [uploaded] = await uploadImages([file]);
  return uploaded;
}

/** Product images are stored as Worker-relative paths; absolute URLs pass through. */
export function mediaUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}
