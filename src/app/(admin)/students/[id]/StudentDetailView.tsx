'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/EditOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SwapIcon from '@mui/icons-material/SwapHoriz';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import NextLink from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { LINK_STATUS, RELATIONS, STUDENT_STATUS, WITHDRAWAL_REASON, formatPhone, isMobile } from '@/lib/student';
import type { Classroom, Guardian, StudentDetail, StudentStatus, WithdrawalReason } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

/**
 * STU-006 원생 상세 — 기본정보·메모, 반 이력, 상태 이력, 형제.
 * 원장·실장: 정보 수정, 반 이동(STU-008), 휴원·퇴원·복귀(STU-012), 보호자 추가·연결 해제(STU-007).
 */
export default function StudentDetailView({ id }: { id: string }) {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [unlinking, setUnlinking] = useState<Guardian | null>(null);

  const detail = useQuery({ queryKey: ['students', instId, 'detail', id], queryFn: () => api.get<StudentDetail>(`students/${id}`), enabled: !!instId });
  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const classNames = useMemo(() => new Map((classes.data ?? []).map((c) => [c.id, c.name])), [classes.data]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['students'] });
    void qc.invalidateQueries({ queryKey: ['classes'] });
  };

  const d = detail.data;
  const s = d?.student;
  const withdrawn = s?.status === 'WITHDRAWN';

  return (
    <>
      <PageHeader
        title={s ? s.name : '원생 상세'}
        menuId="STU-006"
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} component={NextLink} href="/students">
              원생 목록
            </Button>
            {manager && s && (
              <>
                <Button variant="outlined" startIcon={<SwapIcon />} disabled={withdrawn} onClick={() => setMoveOpen(true)}>
                  반 이동
                </Button>
                <Button variant="outlined" onClick={() => setStatusOpen(true)}>
                  {withdrawn ? '복귀 처리' : '휴원·퇴원'}
                </Button>
              </>
            )}
          </>
        }
      />

      {detail.isFetching && !d && <LinearProgress />}
      {detail.isError && <Alert severity="error">{errorMessage(detail.error)}</Alert>}

      {d && s && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <SectionTitle
                title="기본 정보"
                action={
                  manager && (
                    <Button size="small" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
                      수정
                    </Button>
                  )
                }
              />
              <Info label="상태">
                <Chip size="small" label={STUDENT_STATUS[s.status].label} color={STUDENT_STATUS[s.status].color} />
              </Info>
              <Info label="반">{s.classroomIds.map((c) => classNames.get(c) ?? '-').join(', ') || '배정 없음'}</Info>
              <Info label="생년월일">{s.birthDate ?? '••••-••-••'}</Info>
              <Info label="학년">{s.grade ?? '-'}</Info>
              <Info label="형제·자매">
                {d.siblings.length === 0
                  ? '-'
                  : d.siblings.map((x, i) => (
                      <span key={x.studentId}>
                        {i > 0 && ', '}
                        <Link component={NextLink} href={`/students/${x.studentId}`}>
                          {x.name}
                        </Link>
                      </span>
                    ))}
              </Info>
              <Info label="메모">
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {d.memo || '-'}
                </Typography>
              </Info>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <SectionTitle
                title="보호자"
                action={
                  manager &&
                  !withdrawn && (
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setGuardianOpen(true)}>
                      보호자 추가
                    </Button>
                  )
                }
              />
              <Stack spacing={1} divider={<Divider flexItem />}>
                {s.guardians.map((g) => (
                  <Stack key={g.id} direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {g.phone}
                        {g.relation ? ` · ${g.relation}` : ''}
                      </Typography>
                    </Box>
                    {g.isPrimary && <Chip size="small" label="대표" color="primary" variant="outlined" />}
                    <Chip size="small" variant="outlined" color={LINK_STATUS[g.linkStatus]?.color} label={LINK_STATUS[g.linkStatus]?.label ?? g.linkStatus} />
                    {manager && g.linkStatus !== 'UNLINKED' && (
                      <Tooltip title="연결 해제 (STU-007)">
                        <IconButton size="small" onClick={() => setUnlinking(g)} aria-label="연결 해제">
                          <LinkOffIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                ))}
                {s.guardians.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    등록된 보호자가 없습니다
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2.5 }}>
              <SectionTitle title="반 이력" />
              <History
                rows={d.classHistory.map((h) => ({
                  key: h.classroomId + h.fromDate,
                  when: `${h.fromDate} ~ ${h.toDate ?? '현재'}`,
                  what: h.classroomName,
                  current: !h.toDate,
                }))}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2.5 }}>
              <SectionTitle title="재원 상태 이력" />
              <History
                rows={d.statusHistory.map((h, i) => ({
                  key: String(i),
                  when: h.effectiveDate,
                  what: `${h.from ? STUDENT_STATUS[h.from].label : '등록'} → ${STUDENT_STATUS[h.to].label}${h.reason ? ` (${WITHDRAWAL_REASON[h.reason]})` : ''}`,
                  note: h.note,
                }))}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      {d && s && manager && (
        <>
          <EditDialog open={editOpen} detail={d} onClose={() => setEditOpen(false)} onDone={refresh} />
          <MoveClassDialog open={moveOpen} studentId={s.id} current={s.classroomIds} classes={classes.data ?? []} onClose={() => setMoveOpen(false)} onDone={refresh} />
          <StatusDialog open={statusOpen} studentId={s.id} current={s.status} onClose={() => setStatusOpen(false)} onDone={refresh} />
          <AddGuardianDialog open={guardianOpen} studentId={s.id} onClose={() => setGuardianOpen(false)} onDone={refresh} />
          <UnlinkDialog target={unlinking} studentId={s.id} onClose={() => setUnlinking(null)} onDone={refresh} />
        </>
      )}
    </>
  );
}

// ───────── 표시 ─────────

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, minHeight: 32 }}>
      <Typography variant="subtitle1">{title}</Typography>
      {action}
    </Stack>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 80, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, typography: 'body2' }}>{children}</Box>
    </Stack>
  );
}

function History({ rows }: { rows: { key: string; when: string; what: string; current?: boolean; note?: string | null }[] }) {
  if (rows.length === 0)
    return (
      <Typography variant="body2" color="text.secondary">
        이력이 없습니다
      </Typography>
    );
  return (
    <Stack spacing={1}>
      {rows.map((r) => (
        <Stack key={r.key} direction="row" spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ width: 190, flexShrink: 0 }}>
            {r.when}
          </Typography>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: r.current ? 600 : 400 }}>
              {r.what}
            </Typography>
            {r.note && (
              <Typography variant="caption" color="text.secondary">
                {r.note}
              </Typography>
            )}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

// ───────── 다이얼로그 ─────────

type DialogProps = { open: boolean; onClose: () => void; onDone: () => void };

function useAction<T>(fn: (v: T) => Promise<unknown>, { onClose, onDone }: Pick<DialogProps, 'onClose' | 'onDone'>) {
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
}

/** STU-006 기본정보·메모 수정 (빈 값은 "변경 없음"으로 처리됨) */
function EditDialog({ open, detail, onClose, onDone }: DialogProps & { detail: StudentDetail }) {
  const s = detail.student;
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Dayjs | null>(null);
  const [grade, setGrade] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(s.name);
    setBirthDate(s.birthDate ? dayjs(s.birthDate) : null);
    setGrade(s.grade ?? '');
    setMemo(detail.memo ?? '');
  }, [open, s, detail.memo]);

  const save = useAction(
    () =>
      api.patch(`students/${s.id}`, {
        name: name.trim() !== s.name ? name.trim() : null,
        birthDate: birthDate && birthDate.format('YYYY-MM-DD') !== s.birthDate ? birthDate.format('YYYY-MM-DD') : null,
        grade: grade.trim() !== (s.grade ?? '') ? grade.trim() : null,
        memo: memo !== (detail.memo ?? '') ? memo : null,
      }),
    { onClose, onDone },
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>기본 정보 수정</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="이름" required fullWidth value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} />
            <DatePicker label="생년월일" value={birthDate} onChange={setBirthDate} disableFuture format="YYYY-MM-DD" slotProps={{ textField: { fullWidth: true } }} />
          </Stack>
          <TextField label="학년" value={grade} onChange={(e) => setGrade(e.target.value)} inputProps={{ maxLength: 20 }} />
          <TextField label="메모 (교직원만 보임)" multiline minRows={3} value={memo} onChange={(e) => setMemo(e.target.value)} inputProps={{ maxLength: 2000 }} />
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!name.trim() || save.isPending} onClick={() => save.mutate(undefined)}>
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** STU-008 반 이동. 이전 반 소속은 적용일 전날로 마감되고 이력에 남는다. */
function MoveClassDialog({ open, studentId, current, classes, onClose, onDone }: DialogProps & { studentId: string; current: string[]; classes: Classroom[] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState<Dayjs | null>(dayjs());

  useEffect(() => {
    if (!open) return;
    setFrom(current.length === 1 ? current[0] : '');
    setTo('');
    setDate(dayjs());
  }, [open, current]);

  const move = useAction(
    () => api.post(`students/${studentId}/class-move`, { toClassroomId: to, fromClassroomId: from || null, effectiveDate: date?.format('YYYY-MM-DD') }),
    { onClose, onDone },
  );

  const targets = classes.filter((c) => !current.includes(c.id));
  const selected = classes.find((c) => c.id === to);
  const full = selected && selected.headcount !== null && selected.headcount >= selected.capacity;
  const needFrom = current.length > 1;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>반 이동 · STU-008</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {current.length > 0 && (
            <TextField select label="현재 반" value={from} onChange={(e) => setFrom(e.target.value)} required={needFrom} disabled={!needFrom}>
              {current.map((c) => (
                <MenuItem key={c} value={c}>
                  {classes.find((x) => x.id === c)?.name ?? c}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            label="이동할 반"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            error={!!full}
            helperText={full ? '정원이 찬 반입니다' : selected ? `현재 ${selected.headcount ?? '-'} / 정원 ${selected.capacity}명` : ' '}
          >
            {targets.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <DatePicker label="적용일" value={date} onChange={setDate} format="YYYY-MM-DD" />
          {move.isError && <Alert severity="error">{errorMessage(move.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!to || !!full || (needFrom && !from) || !date?.isValid() || move.isPending} onClick={() => move.mutate(undefined)}>
          이동
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** STU-012 휴원·퇴원·복귀. 퇴원은 사유 필수(퇴원 사유 통계). */
function StatusDialog({ open, studentId, current, onClose, onDone }: DialogProps & { studentId: string; current: StudentStatus }) {
  const options = (Object.keys(STUDENT_STATUS) as StudentStatus[]).filter((x) => x !== current);
  const [to, setTo] = useState<StudentStatus>(options[0]);
  const [reason, setReason] = useState<WithdrawalReason | ''>('');
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setTo(current === 'WITHDRAWN' ? 'ACTIVE' : current === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    setReason('');
    setDate(dayjs());
    setNote('');
  }, [open, current]);

  const change = useAction(
    () =>
      api.post(`students/${studentId}/status`, {
        status: to,
        reason: to === 'WITHDRAWN' ? reason : null,
        effectiveDate: date?.format('YYYY-MM-DD'),
        note: note.trim() || null,
      }),
    { onClose, onDone },
  );

  const label = (x: StudentStatus) => (x === 'ACTIVE' ? (current === 'WITHDRAWN' ? '복귀(재등록)' : '재원 복귀') : STUDENT_STATUS[x].label);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>재원 상태 변경 · STU-012</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            현재 상태: {STUDENT_STATUS[current].label}
          </Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={to} onChange={(_, v) => v && setTo(v)}>
            {options.map((x) => (
              <ToggleButton key={x} value={x}>
                {label(x)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {to === 'WITHDRAWN' && (
            <TextField select label="퇴원 사유" required value={reason} onChange={(e) => setReason(e.target.value as WithdrawalReason)}>
              {(Object.keys(WITHDRAWAL_REASON) as WithdrawalReason[]).map((r) => (
                <MenuItem key={r} value={r}>
                  {WITHDRAWAL_REASON[r]}
                </MenuItem>
              ))}
            </TextField>
          )}
          <DatePicker label="적용일" value={date} onChange={setDate} format="YYYY-MM-DD" />
          <TextField label="메모" multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 500 }} />
          {to === 'WITHDRAWN' && <Alert severity="warning">퇴원하면 반 소속이 끝나고 출결 대상에서 빠집니다.</Alert>}
          {change.isError && <Alert severity="error">{errorMessage(change.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          color={to === 'WITHDRAWN' ? 'error' : 'primary'}
          disabled={(to === 'WITHDRAWN' && !reason) || !date?.isValid() || change.isPending}
          onClick={() => change.mutate(undefined)}
        >
          변경
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AddGuardianDialog({ open, studentId, onClose, onDone }: DialogProps & { studentId: string }) {
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('아버지');
  const [primary, setPrimary] = useState(false);
  const [sendGuide, setSendGuide] = useState(true);

  useEffect(() => {
    if (!open) return;
    setPhone('');
    setRelation('아버지');
    setPrimary(false);
    setSendGuide(true);
  }, [open]);

  const add = useAction(() => api.post(`students/${studentId}/guardians`, { phone, relation, isPrimary: primary, sendInstallGuide: sendGuide }), { onClose, onDone });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>보호자 추가</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="휴대폰 번호"
            required
            autoFocus
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            error={!!phone && !isMobile(phone)}
            helperText={phone && !isMobile(phone) ? '휴대폰 번호 형식이 아닙니다' : ' '}
            inputProps={{ inputMode: 'numeric' }}
          />
          <TextField select label="관계" value={relation} onChange={(e) => setRelation(e.target.value)}>
            {RELATIONS.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel control={<Checkbox checked={primary} onChange={(e) => setPrimary(e.target.checked)} />} label="대표 보호자로 지정" />
          <FormControlLabel control={<Checkbox checked={sendGuide} onChange={(e) => setSendGuide(e.target.checked)} />} label="앱 설치 안내 알림톡 보내기" />
          {add.isError && <Alert severity="error">{errorMessage(add.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!isMobile(phone) || add.isPending} onClick={() => add.mutate(undefined)}>
          추가
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** STU-007 학부모 계정 연결 해제 — 해당 보호자는 더 이상 알림·출결 푸시를 받지 않는다 */
function UnlinkDialog({ target, studentId, onClose, onDone }: { target: Guardian | null; studentId: string; onClose: () => void; onDone: () => void }) {
  const unlink = useAction(() => api.delete(`students/${studentId}/guardians/${target!.id}`), { onClose, onDone });
  useEffect(() => unlink.reset(), [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>보호자 연결 해제 · STU-007</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            {target?.phone}
            {target?.relation ? ` (${target.relation})` : ''} 보호자의 앱 연결을 해제합니다. 이후 이 원생의 출결 알림·알림장을 받지 못합니다.
          </Typography>
          {unlink.isError && <Alert severity="error">{errorMessage(unlink.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" color="error" disabled={unlink.isPending} onClick={() => unlink.mutate(undefined)}>
          연결 해제
        </Button>
      </DialogActions>
    </Dialog>
  );
}
