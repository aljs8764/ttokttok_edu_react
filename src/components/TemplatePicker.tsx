'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAddOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { NoticeTemplate } from '@/lib/comm';
import { useSession } from '@/lib/session';
import type { NoticeKind } from '@/lib/types';
import { useT } from '@/lib/i18n';

/** NTC-003 작성 화면에서 템플릿 불러오기 / 지금 내용을 템플릿으로 저장 */
export default function TemplatePicker({
  kind,
  title,
  body,
  onPick,
  disabled,
}: {
  kind: NoticeKind;
  title: string;
  body: string;
  onPick: (t: { title: string; body: string }) => void;
  disabled?: boolean;
}) {
  const tr = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saved, setSaved] = useState('');

  const list = useQuery({ queryKey: ['notice-templates', instId, kind], queryFn: () => api.get<NoticeTemplate[]>('notice-templates', { kind }), enabled: !!instId });
  const use = useMutation({ mutationFn: (id: string) => api.post(`notice-templates/${id}/use`) });
  const save = useMutation({
    mutationFn: (name: string) => api.post('notice-templates', { kind, name, title: title.trim(), body: body.trim() }),
    onSuccess: () => {
      setSaved(tr('템플릿으로 저장했습니다'));
      void qc.invalidateQueries({ queryKey: ['notice-templates'] });
    },
  });

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<ArticleIcon />} disabled={disabled} onClick={(e) => setAnchor(e.currentTarget)}>
          {tr('템플릿 불러오기')}
        </Button>
        <Button
          size="small"
          variant="text"
          startIcon={<BookmarkAddIcon />}
          disabled={disabled || !title.trim() || !body.trim() || save.isPending}
          onClick={() => {
            const name = window.prompt(tr('템플릿 이름'), title.trim().slice(0, 50));
            if (name?.trim()) {
              setSaved('');
              save.mutate(name.trim());
            }
          }}
        >
          {tr('현재 내용을 템플릿으로 저장')}
        </Button>
      </Stack>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {list.data?.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2">{tr('저장된 템플릿이 없습니다')}</Typography>
          </MenuItem>
        )}
        {list.data?.map((t) => (
          <MenuItem
            key={t.id}
            onClick={() => {
              onPick({ title: t.title, body: t.body });
              use.mutate(t.id);
              setAnchor(null);
            }}
          >
            {t.name}
          </MenuItem>
        ))}
      </Menu>
      {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
      {saved && <Alert severity="success">{saved}</Alert>}
    </Stack>
  );
}
