import type { ApiErrorBody } from './types';

/** 백엔드 오류 {code, message, details} */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function toQuery(q?: Query) {
  if (!q) return '';
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const res = await fetch(`/api/proxy/${path.replace(/^\//, '')}${toQuery(opts.query)}`, {
    method,
    headers: { Accept: 'application/json', ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? `요청에 실패했습니다 (${res.status})`, err?.details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>('POST', path, { body, headers }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, { body }),
};

/** 엑셀 등 파일 응답을 받아 브라우저 다운로드로 저장 */
export async function download(method: 'GET' | 'POST', path: string, body?: unknown, fallbackName = 'download.xlsx') {
  const res = await fetch(`/api/proxy/${path.replace(/^\//, '')}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? '다운로드에 실패했습니다');
  }
  const blob = await res.blob();
  const name = filenameFrom(res.headers.get('content-disposition')) ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function filenameFrom(disposition: string | null) {
  if (!disposition) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1] : null;
}

export function errorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return '알 수 없는 오류가 발생했습니다';
}

export function newIdempotencyKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
