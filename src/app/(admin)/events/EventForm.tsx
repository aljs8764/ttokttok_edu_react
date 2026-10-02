'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { SchoolEvent, Target } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import TargetPicker, { toTargetRequest } from '@/components/TargetPicker';

export const REMINDER_OPTIONS = [
  { value: 6, label: '마감 6시간 전' },
  { value: 12, label: '마감 12시간 전' },
  { value: 24, label: '마감 하루 전' },
  { value: 48, label: '마감 이틀 전' },
  { value: 72, label: '마감 사흘 전' },
];

/** 행사 시각 검사 (생성·수정 공용). 문제가 없으면 '' */
export function eventTimeError(startsAt: Dayjs | null, endsAt: Dayjs | null, rsvp: boolean, deadline: Dayjs | null, isNew: boolean) {
  const now = dayjs();
  if (!startsAt?.isValid()) return '시작 시각을 고르세요';
  if (isNew && !startsAt.isAfter(now)) return '행사 시작은 현재 이후여야 합니다';
  if (endsAt && !endsAt.isAfter(startsAt)) return '종료는 시작 이후여야 합니다';
  if (rsvp) {
    if (!deadline?.isValid()) return '응답 마감 시각을 고르세요';
    if (deadline.isAfter(startsAt)) return '응답 마감은 행사 시작 전이어야 합니다';
    if (isNew && !deadline.isAfter(now)) return '응답 마감은 현재 이후여야 합니다';
  }
  return '';
}

/**
 * EVT-001 행사 만들기 + RSVP(참석 여부) 받기.
 * 마감 전 설정한 시점에 미응답 보호자에게 자동 독촉 푸시가 한 번 간다 (5분 주기 스케줄러).
 */
export default function EventForm() {
  const qc = useQueryClient();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState<Dayjs | null>(dayjs().add(7, 'day').hour(10).minute(0).second(0));
  const [endsAt, setEndsAt] = useState<Dayjs | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [rsvp, setRsvp] = useState(true);
  const [deadline, setDeadline] = useState<Dayjs | null>(dayjs().add(5, 'day').hour(18).minute(0).second(0));
  const [reminder, setReminder] = useState(24);

  const save = useMutation({
    mutationFn: () =>
      api.post<SchoolEvent>('events', {
        title: title.trim(),
        body: body.trim() || null,
        location: location.trim() || null,
        startsAt: startsAt!.toISOString(),
        endsAt: endsAt?.toISOString() ?? null,
        targets: toTargetRequest(targets),
        rsvpEnabled: rsvp,
        rsvpDeadline: rsvp ? deadline!.toISOString() : null,
        reminderHoursBefore: rsvp ? reminder : null,
      }),
    onSuccess: (e) => {
      void qc.invalidateQueries({ queryKey: ['events'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.push(`/events/${e.id}`);
    },
  });

  const timeError = eventTimeError(startsAt, endsAt, rsvp, deadline, true);
  const valid = title.trim() && targets.length > 0 && !timeError;

  return (
    <>
      <PageHeader
        title="행사 만들기"
        menuId="EVT-001"
        actions={
          <Button startIcon={<ArrowBackIcon />} component={NextLink} href="/events">
            목록
          </Button>
        }
      />
      <Paper sx={{ p: 3, maxWidth: 820 }}>
        <Stack spacing={2.5}>
          <TextField label="행사명" required value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 100 }} placeholder="예: 가을 소풍" />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <DateTimePicker label="시작 *" value={startsAt} onChange={setStartsAt} disablePast format="YYYY-MM-DD HH:mm" ampm={false} slotProps={{ textField: { fullWidth: true } }} />
            <DateTimePicker label="종료 (선택)" value={endsAt} onChange={setEndsAt} minDateTime={startsAt ?? undefined} format="YYYY-MM-DD HH:mm" ampm={false} slotProps={{ textField: { fullWidth: true }, field: { clearable: true } }} />
          </Stack>
          <TextField label="장소" value={location} onChange={(e) => setLocation(e.target.value)} inputProps={{ maxLength: 200 }} />
          <TextField label="안내 내용" multiline minRows={5} value={body} onChange={(e) => setBody(e.target.value)} inputProps={{ maxLength: 5000 }} helperText={`${body.length}/5000 · 준비물, 회비, 복장 등`} />

          <Divider />
          <TargetPicker value={targets} onChange={setTargets} />

          <Divider />
          <FormControlLabel control={<Switch checked={rsvp} onChange={(e) => setRsvp(e.target.checked)} />} label="참석 여부 받기 (RSVP)" />
          {rsvp && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <DateTimePicker
                label="응답 마감 *"
                value={deadline}
                onChange={setDeadline}
                disablePast
                maxDateTime={startsAt ?? undefined}
                format="YYYY-MM-DD HH:mm"
                ampm={false}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TextField select label="자동 독촉" value={reminder} onChange={(e) => setReminder(Number(e.target.value))} fullWidth helperText="미응답 보호자에게 한 번 푸시">
                {REMINDER_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
          {timeError && (startsAt || deadline) && (
            <Typography variant="body2" color="error">
              {timeError}
            </Typography>
          )}
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button component={NextLink} href="/events">
              취소
            </Button>
            <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
              만들고 알리기
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}
