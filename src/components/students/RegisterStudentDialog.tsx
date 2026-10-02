'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { RELATIONS, formatPhone, isMobile } from '@/lib/student';
import type { Classroom, Student } from '@/lib/types';

interface GuardianInput {
  phone: string;
  relation: string;
}

const emptyGuardian = (): GuardianInput => ({ phone: '', relation: '어머니' });

/**
 * STU-003 원생 개별 등록. 보호자 번호로 앱 설치 안내 알림톡이 나가고,
 * 학부모가 같은 번호로 가입하면 자동으로 연결된다.
 */
export default function RegisterStudentDialog({
  open,
  classes,
  onClose,
  onCreated,
}: {
  open: boolean;
  classes: Classroom[];
  onClose: () => void;
  onCreated?: (s: Student) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Dayjs | null>(null);
  const [grade, setGrade] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [memo, setMemo] = useState('');
  const [guardians, setGuardians] = useState<GuardianInput[]>([emptyGuardian()]);
  const [primary, setPrimary] = useState(0);
  const [sendGuide, setSendGuide] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName('');
    setBirthDate(null);
    setGrade('');
    setClassroomId(classes.length === 1 ? classes[0].id : '');
    setMemo('');
    setGuardians([emptyGuardian()]);
    setPrimary(0);
    setSendGuide(true);
  }, [open, classes]);

  const save = useMutation({
    mutationFn: () =>
      api.post<Student>('students', {
        name: name.trim(),
        birthDate: birthDate!.format('YYYY-MM-DD'),
        grade: grade.trim() || null,
        memo: memo.trim() || null,
        classroomId,
        guardians: guardians.map((g, i) => ({ phone: g.phone, relation: g.relation || null, isPrimary: i === primary })),
        sendInstallGuide: sendGuide,
      }),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['classes'] });
      onCreated?.(s);
      onClose();
    },
  });

  const selected = classes.find((c) => c.id === classroomId);
  const full = selected && selected.headcount !== null && selected.headcount >= selected.capacity;
  const phonesOk = guardians.every((g) => isMobile(g.phone));
  const valid = name.trim() && birthDate?.isValid() && classroomId && phonesOk && !full;

  const setGuardian = (i: number, patch: Partial<GuardianInput>) => setGuardians((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const removeGuardian = (i: number) => {
    setGuardians((gs) => gs.filter((_, j) => j !== i));
    setPrimary((p) => (p === i ? 0 : p > i ? p - 1 : p));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>원생 등록 · STU-003</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="이름" required fullWidth value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} />
            <DatePicker
              label="생년월일 *"
              value={birthDate}
              onChange={setBirthDate}
              disableFuture
              openTo="year"
              views={['year', 'month', 'day']}
              format="YYYY-MM-DD"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              select
              label="반"
              required
              fullWidth
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              error={!!full}
              helperText={full ? '정원이 찼습니다. 반 관리에서 정원을 늘리거나 다른 반을 선택하세요' : selected ? `현재 ${selected.headcount ?? '-'} / 정원 ${selected.capacity}명` : ' '}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="학년" fullWidth value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="예: 초3" helperText=" " inputProps={{ maxLength: 20 }} />
          </Stack>

          <Divider />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">보호자</Typography>
            <Button size="small" startIcon={<AddIcon />} disabled={guardians.length >= 4} onClick={() => setGuardians((gs) => [...gs, emptyGuardian()])}>
              보호자 추가
            </Button>
          </Stack>
          {guardians.map((g, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="휴대폰 번호"
                required
                size="small"
                value={g.phone}
                onChange={(e) => setGuardian(i, { phone: formatPhone(e.target.value) })}
                error={!!g.phone && !isMobile(g.phone)}
                helperText={g.phone && !isMobile(g.phone) ? '휴대폰 번호 형식이 아닙니다' : ' '}
                sx={{ flex: 1 }}
                inputProps={{ inputMode: 'numeric' }}
              />
              <TextField select label="관계" size="small" value={g.relation} onChange={(e) => setGuardian(i, { relation: e.target.value })} sx={{ width: 120 }}>
                {RELATIONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel control={<Radio size="small" checked={primary === i} onChange={() => setPrimary(i)} />} label="대표" sx={{ mr: 0, mt: 0.5 }} />
              <IconButton size="small" disabled={guardians.length === 1} onClick={() => removeGuardian(i)} sx={{ mt: 0.5 }} aria-label="보호자 삭제">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}

          <TextField label="메모 (교직원만 보임)" multiline minRows={2} value={memo} onChange={(e) => setMemo(e.target.value)} inputProps={{ maxLength: 500 }} />
          <FormControlLabel
            control={<Checkbox checked={sendGuide} onChange={(e) => setSendGuide(e.target.checked)} />}
            label="보호자에게 앱 설치 안내 알림톡 보내기"
          />
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          등록
        </Button>
      </DialogActions>
    </Dialog>
  );
}
