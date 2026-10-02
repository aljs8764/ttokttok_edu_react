'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { FileRef, Notice, NoticeKind, Target } from '@/lib/types';
import AttachmentField from '@/components/AttachmentField';
import PageHeader from '@/components/PageHeader';
import TargetPicker, { toTargetRequest } from '@/components/TargetPicker';

const MAX_TITLE = 100;
const MAX_BODY = 5000;

/**
 * NTC-001 알림장·공지 작성 (즉시 / 예약 발송, 첨부 최대 10개). id 가 있으면 예약 건 수정.
 * 공지(ANNOUNCEMENT)와 전체 대상은 원장·실장만. 예약은 30일 이내.
 */
export default function NoticeForm({ id }: { id?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;

  const [kind, setKind] = useState<NoticeKind>('NOTE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [attachments, setAttachments] = useState<FileRef[]>([]);
  const [scheduled, setScheduled] = useState(false);
  const [sendAt, setSendAt] = useState<Dayjs | null>(null);

  const existing = useQuery({ queryKey: ['notices', instId, 'detail', id], queryFn: () => api.get<Notice>(`notices/${id}`), enabled: !!instId && !!id });

  useEffect(() => {
    const n = existing.data;
    if (!n) return;
    setKind(n.kind);
    setTitle(n.title);
    setBody(n.body);
    setPinned(n.pinned);
    setTargets(n.targets);
    setAttachments(n.attachments);
    setScheduled(true);
    setSendAt(n.scheduledAt ? dayjs(n.scheduledAt) : null);
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => {
      const req = {
        kind,
        title: title.trim(),
        body: body.trim(),
        pinned: kind === 'ANNOUNCEMENT' && pinned,
        targets: toTargetRequest(targets),
        sendAt: scheduled && sendAt ? sendAt.toISOString() : null,
        attachments: attachments.map((a) => a.id),
      };
      return id ? api.patch<Notice>(`notices/${id}`, req) : api.post<Notice>('notices', req);
    },
    onSuccess: (n) => {
      void qc.invalidateQueries({ queryKey: ['notices'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.push(`/notices/${n.id}`);
    },
  });

  const editingLocked = !!existing.data && existing.data.status !== 'SCHEDULED';
  const now = dayjs();
  const scheduleError = scheduled && (!sendAt?.isValid() ? '예약 시각을 고르세요' : !sendAt.isAfter(now) ? '현재 이후로 고르세요' : sendAt.isAfter(now.add(30, 'day')) ? '30일 이내로만 예약할 수 있습니다' : '');
  const valid = title.trim() && body.trim() && targets.length > 0 && !scheduleError && !editingLocked;

  return (
    <>
      <PageHeader
        title={id ? '예약 알림장 수정' : '알림장 쓰기'}
        menuId="NTC-001"
        actions={
          <Button startIcon={<ArrowBackIcon />} component={NextLink} href={id ? `/notices/${id}` : '/notices'}>
            {id ? '상세로' : '목록'}
          </Button>
        }
      />
      {existing.isFetching && <LinearProgress />}
      {editingLocked && <Alert severity="info" sx={{ mb: 2 }}>이미 발송되었거나 취소된 알림장은 수정할 수 없습니다.</Alert>}

      <Paper sx={{ p: 3, maxWidth: 820 }}>
        <Stack spacing={2.5}>
          {manager && (
            <ToggleButtonGroup exclusive size="small" value={kind} onChange={(_, v) => v && setKind(v)}>
              <ToggleButton value="NOTE">알림장</ToggleButton>
              <ToggleButton value="ANNOUNCEMENT">공지</ToggleButton>
            </ToggleButtonGroup>
          )}

          <TargetPicker value={targets} onChange={setTargets} disabled={editingLocked} />
          <Divider />

          <TextField
            label="제목"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ maxLength: MAX_TITLE }}
            helperText={`${title.length}/${MAX_TITLE}`}
          />
          <TextField
            label="내용"
            required
            multiline
            minRows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            inputProps={{ maxLength: MAX_BODY }}
            helperText={`${body.length}/${MAX_BODY}`}
          />
          <AttachmentField purpose="NOTICE_ATTACHMENT" value={attachments} onChange={setAttachments} disabled={editingLocked} />
          {kind === 'ANNOUNCEMENT' && (
            <FormControlLabel control={<Checkbox checked={pinned} onChange={(e) => setPinned(e.target.checked)} />} label="학부모 앱 상단에 고정" />
          )}

          <Divider />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <ToggleButtonGroup exclusive size="small" value={scheduled ? 'later' : 'now'} onChange={(_, v) => v && setScheduled(v === 'later')} disabled={!!id}>
              <ToggleButton value="now">바로 보내기</ToggleButton>
              <ToggleButton value="later">예약 발송</ToggleButton>
            </ToggleButtonGroup>
            {scheduled && (
              <DateTimePicker
                label="보낼 시각"
                value={sendAt}
                onChange={setSendAt}
                disablePast
                maxDateTime={now.add(30, 'day')}
                format="YYYY-MM-DD HH:mm"
                ampm={false}
                slotProps={{ textField: { size: 'small', error: !!scheduleError && !!sendAt, helperText: sendAt ? scheduleError : ' ' } }}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            학부모 앱으로 푸시가 갑니다. 열람 여부는 상세 화면의 수신 확인에서 볼 수 있고, 미열람자에게만 다시 보낼 수 있습니다.
          </Typography>

          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button component={NextLink} href={id ? `/notices/${id}` : '/notices'}>
              취소
            </Button>
            <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
              {id ? '저장' : scheduled ? '예약하기' : '보내기'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}
