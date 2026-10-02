'use client';

import { useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { errorMessage } from '@/lib/api';
import { acceptFor, checkFile, fileSize, openFile, uploadFile, type FilePurpose } from '@/lib/files';
import type { FileRef } from '@/lib/types';

/** 첨부 파일 (jpg·png·heic·pdf, 20MB, 최대 max 개). 고르는 즉시 업로드하고 fileId 만 폼에 남긴다. */
export default function AttachmentField({
  purpose,
  value,
  onChange,
  max = 10,
  disabled,
}: {
  purpose: FilePurpose;
  value: FileRef[];
  onChange: (files: FileRef[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');

  const add = async (list: FileList | null) => {
    if (!list) return;
    setError('');
    const files = Array.from(list).slice(0, Math.max(0, max - value.length));
    if (list.length > files.length) setError(`첨부는 최대 ${max}개입니다`);
    const bad = files.map((f) => checkFile(purpose, f)).find(Boolean);
    if (bad) return setError(bad);

    setUploading(files.length);
    const done: FileRef[] = [];
    for (const f of files) {
      try {
        done.push(await uploadFile(purpose, f));
      } catch (e) {
        setError(`${f.name}: ${errorMessage(e)}`);
      }
      setUploading((n) => n - 1);
    }
    onChange([...value, ...done]);
  };

  return (
    <Box>
      <input ref={ref} type="file" hidden multiple accept={acceptFor(purpose)} onChange={(e) => (void add(e.target.files), (e.target.value = ''))} />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }} alignItems="center">
        <Button size="small" variant="outlined" startIcon={<AttachFileIcon />} disabled={disabled || uploading > 0 || value.length >= max} onClick={() => ref.current?.click()}>
          파일 첨부
        </Button>
        {value.map((f) => (
          <Chip
            key={f.id}
            label={`${f.name} · ${fileSize(f.size)}`}
            onClick={() => void openFile(f.id).catch((e) => setError(errorMessage(e)))}
            onDelete={disabled ? undefined : () => onChange(value.filter((x) => x.id !== f.id))}
          />
        ))}
      </Stack>
      {uploading > 0 && <LinearProgress sx={{ mt: 1 }} />}
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
