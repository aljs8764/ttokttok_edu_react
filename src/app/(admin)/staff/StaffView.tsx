'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import MailIcon from '@mui/icons-material/MailOutline';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1';
import RefreshIcon from '@mui/icons-material/Autorenew';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { ROLE_LABEL, dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Role, StaffInvitation, StaffInvitationStatus, StaffMember } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

const INVITE_STATUS: Record<StaffInvitationStatus, { label: string; color: 'warning' | 'success' | 'default' }> = {
  PENDING: { label: '수락 대기', color: 'warning' },
  ACCEPTED: { label: '수락', color: 'success' },
  REVOKED: { label: '취소', color: 'default' },
  EXPIRED: { label: '만료', color: 'default' },
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * STF-001 교직원 목록·직접 등록(임시 비밀번호), STF-002 이메일 초대.
 * 목록은 원장·실장이 보고, 등록·초대·초대 취소는 원장만.
 */
export default function StaffView() {
  const qc = useQueryClient();
  const { session, role } = useSession();
  const instId = session?.institution?.institutionId;
  const owner = role === 'OWNER';
  const [tab, setTab] = useState<'staff' | 'invitations'>('staff');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<StaffInvitation | null>(null);

  const staff = useQuery({ queryKey: ['staff', instId], queryFn: () => api.get<StaffMember[]>('staff'), enabled: !!instId });
  const invitations = useQuery({ queryKey: ['staff-invitations', instId], queryFn: () => api.get<StaffInvitation[]>('staff/invitations'), enabled: !!instId });
  const pendingCount = invitations.data?.filter((i) => i.status === 'PENDING').length ?? 0;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['staff'] });
    void qc.invalidateQueries({ queryKey: ['staff-invitations'] });
  };

  return (
    <>
      <PageHeader
        title="교직원"
        menuId="STF-001"
        description={owner ? '이메일 초대를 권장합니다. 받은 사람이 직접 비밀번호를 정하고 바로 로그인합니다.' : '교직원 등록·초대는 원장만 할 수 있습니다.'}
        actions={
          owner && (
            <>
              <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)}>
                직접 등록
              </Button>
              <Button variant="contained" startIcon={<MailIcon />} onClick={() => setInviteOpen(true)}>
                이메일 초대
              </Button>
            </>
          )
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="staff" label={`교직원 ${staff.data?.length ?? ''}`} />
        <Tab value="invitations" label={pendingCount ? `초대 내역 (대기 ${pendingCount})` : '초대 내역'} />
      </Tabs>

      {tab === 'staff' && (
        <Paper>
          {staff.isFetching && <LinearProgress />}
          {staff.isError && <Alert severity="error">{errorMessage(staff.error)}</Alert>}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>권한</TableCell>
                  <TableCell>직함</TableCell>
                  <TableCell>이메일</TableCell>
                  <TableCell>담당 반</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staff.data?.map((s) => (
                  <TableRow key={s.userId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={ROLE_LABEL[s.role]} color={s.role === 'OWNER' ? 'primary' : s.role === 'ADMIN' ? 'secondary' : 'default'} variant={s.role === 'TEACHER' ? 'outlined' : 'filled'} />
                    </TableCell>
                    <TableCell>{s.title ?? '-'}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>
                      {s.classrooms.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {s.role === 'TEACHER' ? '없음 (반 관리에서 배정)' : '-'}
                        </Typography>
                      ) : (
                        s.classrooms.map((c) => c.name).join(', ')
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 'invitations' && (
        <Paper>
          {invitations.isFetching && <LinearProgress />}
          {invitations.isError && <Alert severity="error">{errorMessage(invitations.error)}</Alert>}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>이메일</TableCell>
                  <TableCell>권한</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>유효 기한 / 수락</TableCell>
                  {owner && <TableCell align="right" />}
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      초대 내역이 없습니다
                    </TableCell>
                  </TableRow>
                )}
                {invitations.data?.map((i) => (
                  <TableRow key={i.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{i.name}</TableCell>
                    <TableCell>{i.email}</TableCell>
                    <TableCell>{ROLE_LABEL[i.role]}</TableCell>
                    <TableCell>
                      <Chip size="small" label={INVITE_STATUS[i.status].label} color={INVITE_STATUS[i.status].color} />
                    </TableCell>
                    <TableCell>{i.acceptedAt ? `${dateTime(i.acceptedAt)} 수락` : `${dateTime(i.expiresAt)} 까지`}</TableCell>
                    {owner && (
                      <TableCell align="right">
                        {i.status === 'PENDING' && (
                          <Button size="small" color="inherit" onClick={() => setRevoking(i)}>
                            취소
                          </Button>
                        )}
                        {(i.status === 'EXPIRED' || i.status === 'REVOKED') && <ResendButton invitation={i} onDone={refresh} />}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {owner && (
        <>
          <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={() => (refresh(), setTab('invitations'))} />
          <CreateStaffDialog open={createOpen} onClose={() => setCreateOpen(false)} onDone={refresh} />
          <RevokeDialog target={revoking} onClose={() => setRevoking(null)} onDone={refresh} />
        </>
      )}
    </>
  );
}

function RoleToggle({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <ToggleButtonGroup exclusive fullWidth size="small" value={value} onChange={(_, v) => v && onChange(v)}>
      <ToggleButton value="TEACHER">교사</ToggleButton>
      <ToggleButton value="ADMIN">실장</ToggleButton>
    </ToggleButtonGroup>
  );
}

/** 만료·취소된 초대를 같은 내용으로 다시 보낸다 */
function ResendButton({ invitation, onDone }: { invitation: StaffInvitation; onDone: () => void }) {
  const resend = useMutation({
    mutationFn: () => api.post('staff/invitations', { email: invitation.email, name: invitation.name, role: invitation.role }),
    onSuccess: onDone,
  });
  return (
    <Tooltip title={resend.isError ? errorMessage(resend.error) : '같은 내용으로 다시 초대'}>
      <span>
        <IconButton size="small" color={resend.isError ? 'error' : 'default'} disabled={resend.isPending} onClick={() => resend.mutate()} aria-label="다시 초대">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** STF-002 이메일 초대 (7일 유효). 같은 이메일의 대기 중 초대는 새 초대로 대체된다. */
function InviteDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('TEACHER');

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setRole('TEACHER');
  }, [open]);

  const invite = useMutation({
    mutationFn: () => api.post('staff/invitations', { name: name.trim(), email: email.trim(), role }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  const emailOk = EMAIL.test(email.trim());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>교직원 이메일 초대 · STF-002</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="이름" required value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} />
          <TextField
            label="이메일"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!email && !emailOk}
            helperText={email && !emailOk ? '이메일 형식이 아닙니다' : '이 주소로 가입 링크가 갑니다 (7일 유효)'}
          />
          <RoleToggle value={role} onChange={setRole} />
          <Typography variant="caption" color="text.secondary">
            실장은 원생·반·출결·알림장을 모두 관리할 수 있고, 교사는 담당 반만 다룹니다.
          </Typography>
          {invite.isError && <Alert severity="error">{errorMessage(invite.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!name.trim() || !emailOk || invite.isPending} onClick={() => invite.mutate()}>
          초대 보내기
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function randomPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const chars = [...Array.from({ length: 7 }, () => pick(letters)), ...Array.from({ length: 3 }, () => pick(digits))];
  return chars.sort(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 - 0.5).join('');
}

/** STF-001 직접 등록 — 임시 비밀번호를 원장이 전달하고, 첫 로그인 때 변경을 강제한다 */
function CreateStaffDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<Role>('TEACHER');
  const [password, setPassword] = useState('');
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setTitle('');
    setRole('TEACHER');
    setPassword(randomPassword());
    setCreated(null);
  }, [open]);

  const create = useMutation({
    mutationFn: () => api.post('staff', { name: name.trim(), email: email.trim(), temporaryPassword: password, role, title: title.trim() || null }),
    onSuccess: () => {
      setCreated({ name: name.trim(), email: email.trim(), password });
      onDone();
    },
  });

  const emailOk = EMAIL.test(email.trim());
  const pwOk = password.length >= 8 && /\d/.test(password) && /[A-Za-z]/.test(password);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>교직원 직접 등록 · STF-001</DialogTitle>
      <DialogContent>
        {created ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="success">{created.name} 님을 등록했습니다. 아래 정보를 직접 전달해 주세요. 이 창을 닫으면 비밀번호를 다시 볼 수 없습니다.</Alert>
            <TextField label="아이디(이메일)" value={created.email} InputProps={{ readOnly: true }} />
            <TextField label="임시 비밀번호" value={created.password} InputProps={{ readOnly: true, sx: { fontFamily: 'monospace' } }} />
            <Typography variant="caption" color="text.secondary">
              첫 로그인 때 비밀번호를 바꾸도록 안내됩니다.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1.5}>
              <TextField label="이름" required fullWidth value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} />
              <TextField label="직함" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 수학 강사" inputProps={{ maxLength: 30 }} />
            </Stack>
            <TextField
              label="이메일 (로그인 아이디)"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!email && !emailOk}
              helperText={email && !emailOk ? '이메일 형식이 아닙니다' : ' '}
            />
            <RoleToggle value={role} onChange={setRole} />
            <TextField
              label="임시 비밀번호"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!pwOk}
              helperText={pwOk ? ' ' : '영문·숫자 포함 8자 이상'}
              InputProps={{
                sx: { fontFamily: 'monospace' },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="새로 만들기">
                      <IconButton size="small" onClick={() => setPassword(randomPassword())} aria-label="새 비밀번호">
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {created ? (
          <Button variant="contained" onClick={onClose}>
            확인
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>취소</Button>
            <Button variant="contained" disabled={!name.trim() || !emailOk || !pwOk || create.isPending} onClick={() => create.mutate()}>
              등록
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function RevokeDialog({ target, onClose, onDone }: { target: StaffInvitation | null; onClose: () => void; onDone: () => void }) {
  const revoke = useMutation({
    mutationFn: () => api.delete(`staff/invitations/${target!.id}`),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  useEffect(() => revoke.reset(), [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>초대 취소</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {target?.name} ({target?.email}) 님에게 보낸 초대를 취소합니다. 받은 링크는 더 이상 쓸 수 없습니다.
        </Typography>
        {revoke.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(revoke.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" color="error" disabled={revoke.isPending} onClick={() => revoke.mutate()}>
          초대 취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}
