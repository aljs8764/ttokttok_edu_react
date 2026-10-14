'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { DAYS, DAY_LABEL, dayList, hm } from '@/lib/format';
import { useSession, useSwitchInstitution } from '@/lib/session';
import { INSTITUTION_TYPE_LABEL, type Classroom, type Destination, type DestinationType, type InstitutionSettings, type InstitutionType } from '@/lib/types';
import MenuIdChip from '@/components/ui/MenuIdChip';
import { useSampleInstitution, useStartSample } from '@/components/SampleModeBanner';
import { color } from '@/theme/tokens';
import { useT } from '@/lib/i18n';

const STEPS = ['기관 정보', '하원 목적지', '반 만들기', '시작'];
const DESTINATION_PRESETS: { name: string; type: DestinationType }[] = [
  { name: '집', type: 'HOME' },
  { name: '학원 셔틀', type: 'SHUTTLE' },
  { name: '다른 학원', type: 'ACADEMY' },
];

/** ONB-001 기관정보 입력 위자드 — 원장이 처음 한 번: 기관 정보 → 하원 목적지 → 반 → 원생·교직원·QR 안내. 각 단계는 설정 화면과 같은 API 를 쓴다.
 *  디자인 P1-09: 셸 없는 전체 화면(상단 바 + 단계 막대 + 입력 카드 + 오른쪽 미리보기). */
export default function OnboardingView() {
  const t = useT();
  const { session, role, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const owner = role === 'OWNER';
  const [step, setStep] = useState(0);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box component="header" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: { xs: 2, md: 4 }, py: 2.25, bgcolor: 'background.paper', borderBottom: `1px solid ${color.divider}`, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box aria-hidden sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: color.accent, color: color.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
            똑
          </Box>
          <Typography component="h1" sx={{ fontWeight: 700, fontSize: 18 }}>
            {t('똑똑 시작하기')}
          </Typography>
          <MenuIdChip id="ONB-001" />
        </Box>
        <Button component={NextLink} href="/dashboard" variant="text" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {t('나중에 하기')}
        </Button>
      </Box>

      <Box component="main" sx={{ flex: 1, px: { xs: 2, md: 4 }, pt: 5, pb: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {!owner ? (
          <Alert severity="info" sx={{ width: '100%', maxWidth: 1040 }}>{t('시작하기 설정은 원장만 할 수 있습니다.')}</Alert>
        ) : (
          <>
            <Box component="ol" aria-label={t('설정 단계')} sx={{ listStyle: 'none', m: 0, p: 0, width: '100%', maxWidth: 1040, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1.5 }}>
              {STEPS.map((label, i) => {
                const done = i < step;
                const current = i === step;
                return (
                  <Box component="li" key={label} aria-current={current ? 'step' : undefined} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, color: current || done ? 'text.primary' : 'text.secondary' }}>
                    <Box sx={{ height: 4, borderRadius: 2, bgcolor: current || done ? color.primary : color.divider }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14, fontWeight: current ? 700 : 400 }}>
                      <Box
                        aria-hidden
                        sx={{
                          width: 24,
                          height: 24,
                          flexShrink: 0,
                          borderRadius: '50%',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          ...(current || done ? { bgcolor: color.primary, color: '#FFFFFF' } : { border: '1.5px solid #B9BFD3' }),
                        }}
                      >
                        {done ? '✓' : i + 1}
                      </Box>
                      <Box component="span" sx={{ display: { xs: current ? 'inline' : 'none', sm: 'inline' } }}>{t(label)}</Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ width: '100%', maxWidth: 1040, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
              <Paper component="section" aria-label={t(STEPS[step])} sx={{ flex: '999 1 520px', minWidth: 0, p: { xs: 2.5, md: 4 } }}>
                {step === 0 && <InstitutionStep instId={instId} onNext={() => setStep(1)} />}
                {step === 1 && <DestinationStep instId={instId} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
                {step === 2 && <ClassStep instId={instId} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
                {step === 3 && <DoneStep onBack={() => setStep(2)} />}
              </Paper>
              <Box component="aside" sx={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <ParentPreview instId={instId} />
                {manager && <SampleCard />}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

/** 학부모 앱에서 보이는 기관 카드 미리보기 — 입력한(저장된) 기관 정보 그대로 */
function ParentPreview({ instId }: { instId?: string }) {
  const t = useT();
  const inst = useQuery({ queryKey: ['institution', instId], queryFn: () => api.get<InstitutionSettings>('institution'), enabled: !!instId });
  const d = inst.data;
  return (
    <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>{t('학부모 앱에서 이렇게 보여요')}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, borderRadius: '10px', bgcolor: 'background.default' }}>
        <Box aria-hidden sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: color.accent, color: color.primary, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {d?.name?.slice(0, 1) ?? ''}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{d?.name ?? '—'}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{[d?.address, d?.phone].filter(Boolean).join(' · ') || t('주소·연락처를 입력하면 여기에 보여요')}</Typography>
        </Box>
      </Box>
    </Paper>
  );
}

/** 샘플 데이터로 먼저 둘러보기 (ONB-003) — 계정 메뉴의 체험 기관과 같은 기능 */
function SampleCard() {
  const t = useT();
  const sample = useSampleInstitution();
  const startSample = useStartSample();
  const switchInst = useSwitchInstitution();
  const mine = sample.data?.sample;
  return (
    <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.25, bgcolor: '#FFFAF8', borderColor: '#F6D3C9' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('샘플 데이터로 먼저 둘러보기')}</Typography>
        <MenuIdChip id="ONB-003" />
      </Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>{t('원생·반이 들어간 데모 기관에서 기능을 먼저 체험해요.')}</Typography>
      <Button
        variant="outlined"
        disabled={startSample.isPending || switchInst.isPending}
        onClick={() => (mine ? switchInst.mutate(mine.institutionId) : startSample.mutate())}
      >
        {t(mine ? '체험 기관으로 이동' : '체험 모드 시작')}
      </Button>
    </Paper>
  );
}

function StepActions({ onBack, onNext, nextLabel = '다음', disabled, loading }: { onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean; loading?: boolean }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 3 }} justifyContent="space-between">
      {onBack ? <Button onClick={onBack}>이전</Button> : <span />}
      <Button variant="contained" onClick={onNext} disabled={disabled || loading}>
        {nextLabel}
      </Button>
    </Stack>
  );
}

function InstitutionStep({ instId, onNext }: { instId?: string; onNext: () => void }) {
  const qc = useQueryClient();
  const inst = useQuery({ queryKey: ['institution', instId], queryFn: () => api.get<InstitutionSettings>('institution'), enabled: !!instId });
  const [type, setType] = useState<InstitutionType>('ACADEMY');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [late, setLate] = useState('10');
  const [early, setEarly] = useState('10');

  useEffect(() => {
    const d = inst.data;
    if (!d) return;
    setType(d.type ?? 'ACADEMY');
    setAddress(d.address ?? '');
    setPhone(d.phone ?? '');
    setLate(String(d.lateThresholdMinutes));
    setEarly(String(d.earlyLeaveThresholdMinutes));
  }, [inst.data]);

  const save = useMutation({
    mutationFn: (d: InstitutionSettings) =>
      api.put<InstitutionSettings>('institution', {
        name: d.name,
        ownerName: d.ownerName,
        address: address.trim() || null,
        phone: phone.trim() || null,
        lateThresholdMinutes: Number(late),
        earlyLeaveThresholdMinutes: Number(early),
        logoFileId: d.logo?.id ?? null,
        sealFileId: d.seal?.id ?? null,
        type,
      }),
    onSuccess: (d) => {
      qc.setQueryData(['institution', instId], d);
      void qc.invalidateQueries({ queryKey: ['session'] });
      onNext();
    },
  });

  const minutesError = (v: string) => (!/^\d+$/.test(v) || Number(v) > 120 ? '0~120분' : '');
  const phoneError = phone && !/^[0-9-]{8,15}$/.test(phone) ? '숫자와 - 만 (8~15자)' : '';
  const valid = !minutesError(late) && !minutesError(early) && !phoneError;

  if (inst.isError) return <Alert severity="error">{errorMessage(inst.error)}</Alert>;
  if (!inst.data) return <LinearProgress />;

  return (
    <>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        {inst.data.name} · 대표 {inst.data.ownerName}
      </Typography>
      <Stack spacing={2}>
        <TextField select label="기관 종류" value={type} onChange={(e) => setType(e.target.value as InstitutionType)} helperText="학부모 앱에서 아이가 다니는 곳을 구분해 보여줍니다">
          {(Object.keys(INSTITUTION_TYPE_LABEL) as InstitutionType[]).map((t) => (
            <MenuItem key={t} value={t}>
              {INSTITUTION_TYPE_LABEL[t]}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="주소" value={address} onChange={(e) => setAddress(e.target.value)} inputProps={{ maxLength: 200 }} />
        <TextField label="대표 전화" value={phone} onChange={(e) => setPhone(e.target.value)} error={!!phoneError} helperText={phoneError || '학부모 알림톡·안내에 표시됩니다'} inputProps={{ maxLength: 15 }} />
        <Stack direction="row" spacing={1.5}>
          <TextField label="지각 기준 (분)" value={late} onChange={(e) => setLate(e.target.value)} error={!!minutesError(late)} helperText={minutesError(late) || '수업 시작 후 이 시간이 지나면 지각'} fullWidth />
          <TextField label="조퇴 기준 (분)" value={early} onChange={(e) => setEarly(e.target.value)} error={!!minutesError(early)} helperText={minutesError(early) || '수업 종료 이 시간 전에 하원하면 조퇴'} fullWidth />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          로고·직인은 설정 &gt; 기관 정보에서 올릴 수 있습니다.
        </Typography>
        {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
      </Stack>
      <StepActions onNext={() => save.mutate(inst.data!)} disabled={!valid} loading={save.isPending} nextLabel="저장하고 다음" />
    </>
  );
}

function DestinationStep({ instId, onBack, onNext }: { instId?: string; onBack: () => void; onNext: () => void }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['destinations', instId], queryFn: () => api.get<Destination[]>('destinations'), enabled: !!instId });
  const [name, setName] = useState('');
  const add = useMutation({
    mutationFn: (d: { name: string; type: DestinationType }) => api.post('destinations', { ...d, sortOrder: list.data?.length ?? 0 }),
    onSuccess: () => {
      setName('');
      void qc.invalidateQueries({ queryKey: ['destinations'] });
    },
  });
  const names = new Set((list.data ?? []).map((d) => d.name));

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        하원 처리 때 교사가 고르는 목적지입니다. 자주 쓰는 것을 눌러 추가하세요.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        {DESTINATION_PRESETS.map((p) => (
          <Chip key={p.name} label={p.name} color={names.has(p.name) ? 'success' : 'default'} variant={names.has(p.name) ? 'filled' : 'outlined'} onClick={names.has(p.name) || add.isPending ? undefined : () => add.mutate(p)} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField size="small" label="직접 추가" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} />
        <Button variant="outlined" disabled={!name.trim() || names.has(name.trim()) || add.isPending} onClick={() => add.mutate({ name: name.trim(), type: 'ETC' })}>
          추가
        </Button>
      </Stack>
      {add.isError && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(add.error)}</Alert>}
      <Typography variant="body2" sx={{ mt: 2 }}>
        등록된 목적지: {list.data && list.data.length > 0 ? list.data.map((d) => d.name).join(', ') : '아직 없습니다'}
      </Typography>
      <StepActions onBack={onBack} onNext={onNext} nextLabel={list.data?.length ? '다음' : '건너뛰기'} />
    </>
  );
}

function ClassStep({ instId, onBack, onNext }: { instId?: string; onBack: () => void; onNext: () => void }) {
  const qc = useQueryClient();
  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [days, setDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('16:00');

  const create = useMutation({
    mutationFn: () => api.post('classes', { name: name.trim(), capacity: Number(capacity), days, startTime: start, endTime: end, teacherIds: [] }),
    onSuccess: () => {
      setName('');
      void qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  const capError = !/^\d+$/.test(capacity) || Number(capacity) < 1 ? '1명 이상' : '';
  const timeError = end <= start ? '끝 시각이 시작보다 늦어야 합니다' : '';
  const valid = name.trim() && !capError && !timeError && days.length > 0;

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        첫 반을 만듭니다. 담임 교사 배정은 교직원 등록 뒤 반 관리에서 합니다.
      </Typography>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5}>
          <TextField label="반 이름" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} fullWidth helperText="엑셀 일괄 등록의 반명과 같아야 합니다" />
          <TextField label="정원" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} error={!!capError} helperText={capError || ' '} inputProps={{ min: 1 }} sx={{ width: 120 }} />
        </Stack>
        <ToggleButtonGroup size="small" value={days} onChange={(_, v: string[]) => setDays(v)} fullWidth>
          {DAYS.map((d) => (
            <ToggleButton key={d} value={d}>
              {DAY_LABEL[d]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" spacing={1.5}>
          <TextField label="시작" type="time" value={start} onChange={(e) => setStart(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="끝" type="time" value={end} onChange={(e) => setEnd(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} error={!!timeError} helperText={timeError} />
        </Stack>
        <Box>
          <Button variant="outlined" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            반 추가
          </Button>
        </Box>
        {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
      </Stack>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        만든 반 {classes.data?.length ?? 0}개
      </Typography>
      {(classes.data ?? []).map((c) => (
        <Typography key={c.id} variant="body2" color="text.secondary">
          {c.name} · {dayList(c.days)} {hm(c.startTime)}~{hm(c.endTime)} · 정원 {c.capacity}명
        </Typography>
      ))}
      <StepActions onBack={onBack} onNext={onNext} nextLabel={classes.data?.length ? '다음' : '건너뛰기'} />
    </>
  );
}

function DoneStep({ onBack }: { onBack: () => void }) {
  const NEXT = [
    { href: '/students', label: '원생 등록', desc: '개별 등록 또는 엑셀 일괄 등록, 학부모 초대' },
    { href: '/staff', label: '교직원 초대', desc: '교사를 이메일로 초대하고 담당 반을 배정' },
    { href: '/qr-codes', label: '출석 QR 만들기', desc: '입구에 붙일 QR 과 기관 위치 설정' },
  ];
  return (
    <>
      <Alert severity="success" sx={{ mb: 2 }}>
        기본 설정을 마쳤습니다. 이제 원생과 교직원을 등록하세요.
      </Alert>
      <Stack spacing={1.5}>
        {NEXT.map((n) => (
          <Paper key={n.href} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2">{n.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {n.desc}
              </Typography>
            </Box>
            <Button component={NextLink} href={n.href} variant="outlined">
              열기
            </Button>
          </Paper>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 3 }} justifyContent="space-between">
        <Button onClick={onBack}>이전</Button>
        <Button variant="contained" component={NextLink} href="/dashboard">
          대시보드로
        </Button>
      </Stack>
    </>
  );
}
