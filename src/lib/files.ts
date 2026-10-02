import { api } from './api';
import type { FileRef } from './types';

export type FilePurpose = 'LOGO' | 'SEAL' | 'ABSENCE_EVIDENCE' | 'NOTICE_ATTACHMENT';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const ALLOWED: Record<FilePurpose, string[]> = {
  LOGO: ['image/jpeg', 'image/png'],
  SEAL: ['image/jpeg', 'image/png'],
  ABSENCE_EVIDENCE: ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'],
  NOTICE_ATTACHMENT: ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'],
};

export const acceptFor = (purpose: FilePurpose) => ALLOWED[purpose].join(',');

/** 브라우저가 HEIC 의 MIME 을 비워 두는 경우가 있어 확장자로 보정 */
function mimeOf(file: File) {
  if (file.type) return file.type;
  if (/\.heic$/i.test(file.name)) return 'image/heic';
  return 'application/octet-stream';
}

/** 업로드 전 검사. 문제가 없으면 null */
export function checkFile(purpose: FilePurpose, file: File): string | null {
  if (!ALLOWED[purpose].includes(mimeOf(file))) return 'jpg·png·heic·pdf 파일만 올릴 수 있습니다';
  if (file.size > MAX_FILE_BYTES) return '20MB 이하 파일만 올릴 수 있습니다';
  return null;
}

/**
 * 스펙 8장 파일 흐름: presign → 브라우저가 S3 로 직접 PUT → complete.
 * 파일 본문은 Next 서버를 거치지 않는다 (S3 버킷에 CORS 필요 — 로컬은 scripts/localstack-init.sh).
 */
export async function uploadFile(purpose: FilePurpose, file: File): Promise<FileRef> {
  const mime = mimeOf(file);
  const { fileId, upload } = await api.post<{ fileId: string; upload: { url: string; method: string; headers: Record<string, string> } }>('files/presign', {
    purpose,
    filename: file.name,
    mime,
    size: file.size,
  });
  const put = await fetch(upload.url, { method: upload.method || 'PUT', headers: upload.headers, body: file });
  if (!put.ok) throw new Error(`파일 업로드에 실패했습니다 (${put.status})`);
  return api.post<FileRef>(`files/${fileId}/complete`);
}

/** 5분짜리 다운로드 URL 을 받아 새 탭으로 연다 */
export async function openFile(fileId: string) {
  const { url } = await api.get<{ url: string }>(`files/${fileId}/download-url`);
  window.open(url, '_blank', 'noopener');
}

export const fileSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`);
