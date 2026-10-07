'use client';

import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { acceptFor, checkFile, uploadFile, type FilePurpose } from '@/lib/files';
import { useSession } from '@/lib/session';
import { INSTITUTION_TYPE_LABEL, type FileRef, type InstitutionSettings, type InstitutionType } from '@/lib/types';

/**
 * SET-001 기관 정보. 수정은 원장만 (실장·교사는 보기만).
 * 지각·조퇴 기준은 출결 판정에 바로 쓰이고, 바꾸면 감사 로그에 남는다.
 * 로고는 학부모 앱·알림에, 직인은 출석부 엑셀에 들어간다.
 */
export default function InstitutionTab() {
  const qc = useQueryClient();
  const { session, role } = useSession();
  const instId = session?.institution?.institutionId;
  const owner = role === 'OWNER';

  const inst = useQuery({ queryKey: ['institution', instId], queryFn: () => api.get<InstitutionSettings>('institution'), enabled: !!instId });

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [late, setLate] = useState('10');
  const [early, setEarly] = useState('10');
  const [logo, setLogo] = useState<FileRef | null>(null);
  const [seal, setSeal] = useState<FileRef | null>(null);
  const [type, setType] = useState<InstitutionType>('ACADEMY');
  const [saved, setSaved] = useState(false);

  const reset = (d: InstitutionSettings) => {
    setName(d.name);
    setOwnerName(d.ownerName);
    setAddress(d.address ?? '');
    setPhone(d.phone ?? '');
    setLate(String(d.lateThresholdMinutes));
    setEarly(String(d.earlyLeaveThresholdMinutes));
    setLogo(d.logo);
    setSeal(d.seal);
    setType(d.type ?? 'ACADEMY');
  };
  useEffect(() => {
    if (inst.data) reset(inst.data);
  }, [inst.data]);

  const save = useMutation({
    mutationFn: () =>
      api.put<InstitutionSettings>('institution', {
        name: name.trim(),
        ownerName: ownerName.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        lateThresholdMinutes: Number(late),
        earlyLeaveThresholdMinutes: Number(early),
        logoFileId: logo?.id ?? null,
        sealFileId: seal?.id ?? null,
        type,
      }),
    onSuccess: (d) => {
      qc.setQueryData(['institution', instId], d);
      void qc.invalidateQueries({ queryKey: ['session'] }); // 사이드바 기관명
      setSaved(true);
    },
  });

  const minutesError = (v: string) => (!/^\d+$/.test(v) || Number(v) > 120 ? '0~120분' : '');
  const phoneError = phone && !/^[0-9-]{8,15}$/.test(phone) ? '숫자와 - 만 (8~15자)' : '';
  const valid = name.trim() && ownerName.trim() && !minutesError(late) && !minutesError(early) && !phoneError;
  const ro = !owner;

  if (inst.isError) return <Alert severity="error">{errorMessage(inst.error)}</Alert>;
  if (!inst.data) return <LinearProgress />;

  return (
    <Paper sx={{ p: 3, maxWidth: 900 }}>
      {ro && (
        <Alert severity="info" sx={{ mb: 2 }}>
          기관 정보는 원장만 수정할 수 있습니다.
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="기관명" required fullWidth value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} disabled={ro} inputProps={{ maxLength: 100 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="대표자" required fullWidth value={ownerName} onChange={(e) => (setOwnerName(e.target.value), setSaved(false))} disabled={ro} inputProps={{ maxLength: 50 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            select
            label="기관 종류"
            fullWidth
            value={type}
            onChange={(e) => (setType(e.target.value as InstitutionType), setSaved(false))}
            disabled={ro}
            helperText="학부모 앱에서 아이가 다니는 곳을 구분해 보여줍니다"
          >
            {(Object.keys(INSTITUTION_TYPE_LABEL) as InstitutionType[]).map((t) => (
              <MenuItem key={t} value={t}>
                {INSTITUTION_TYPE_LABEL[t]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField label="주소" fullWidth value={address} onChange={(e) => (setAddress(e.target.value), setSaved(false))} disabled={ro} inputProps={{ maxLength: 200 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="대표 전화"
            fullWidth
            value={phone}
            onChange={(e) => (setPhone(e.target.value.replace(/[^0-9-]/g, '')), setSaved(false))}
            disabled={ro}
            error={!!phoneError}
            helperText={phoneError || ' '}
            placeholder="02-123-4567"
          />
        </Grid>

        <Grid size={12}>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            출결 기준
          </Typography>
          <Typography variant="caption" color="text.secondary">
            수업 시작 후 이 시간이 지나 등원하면 지각, 수업 끝나기 이 시간보다 일찍 하원하면 조퇴로 표시합니다.
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="지각 기준"
            fullWidth
            value={late}
            onChange={(e) => (setLate(e.target.value.replace(/\D/g, '')), setSaved(false))}
            disabled={ro}
            error={!!minutesError(late)}
            helperText={minutesError(late) || ' '}
            InputProps={{ endAdornment: <InputAdornment position="end">분</InputAdornment> }}
            inputProps={{ inputMode: 'numeric' }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="조퇴 기준"
            fullWidth
            value={early}
            onChange={(e) => (setEarly(e.target.value.replace(/\D/g, '')), setSaved(false))}
            disabled={ro}
            error={!!minutesError(early)}
            helperText={minutesError(early) || ' '}
            InputProps={{ endAdornment: <InputAdornment position="end">분</InputAdornment> }}
            inputProps={{ inputMode: 'numeric' }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <ImageField label="로고" hint="학부모 앱과 알림에 표시 · jpg/png" purpose="LOGO" value={logo} onChange={(f) => (setLogo(f), setSaved(false))} disabled={ro} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ImageField label="직인" hint="출석부 엑셀에 찍힘 · 배경 투명 png 권장" purpose="SEAL" value={seal} onChange={(f) => (setSeal(f), setSaved(false))} disabled={ro} />
        </Grid>
      </Grid>

      {owner && (
        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ mt: 3 }}>
          {saved && (
            <Typography variant="body2" color="success.main" sx={{ mr: 1 }}>
              저장했습니다
            </Typography>
          )}
          {save.isError && (
            <Typography variant="body2" color="error" sx={{ mr: 1 }}>
              {errorMessage(save.error)}
            </Typography>
          )}
          <Button onClick={() => (reset(inst.data!), setSaved(false))}>되돌리기</Button>
          <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            저장
          </Button>
        </Stack>
      )}
    </Paper>
  );
}

/** 로고·직인 이미지. 고르면 바로 업로드하고, 저장을 눌러야 기관에 반영된다 */
function ImageField({
  label,
  hint,
  purpose,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  purpose: FilePurpose;
  value: FileRef | null;
  onChange: (f: FileRef | null) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  // 새로 고른 파일은 로컬 미리보기, 기존 파일은 서명 URL
  const src = preview ?? value?.downloadUrl ?? null;

  const pick = async (f?: File) => {
    if (!f) return;
    setError('');
    const bad = checkFile(purpose, f);
    if (bad) return setError(bad);
    setBusy(true);
    try {
      const uploaded = await uploadFile(purpose, f);
      setPreview(URL.createObjectURL(f));
      onChange(uploaded);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2">{label}</Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Box
          sx={{
            width: 96,
            height: 96,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.default',
            overflow: 'hidden',
          }}
        >
          {src && value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              없음
            </Typography>
          )}
        </Box>
        {!disabled && (
          <Stack spacing={1}>
            <input ref={ref} type="file" hidden accept={acceptFor(purpose)} onChange={(e) => (void pick(e.target.files?.[0]), (e.target.value = ''))} />
            <Button size="small" variant="outlined" disabled={busy} onClick={() => ref.current?.click()}>
              {value ? '바꾸기' : '올리기'}
            </Button>
            {value && (
              <Button size="small" color="inherit" disabled={busy} onClick={() => (setPreview(null), onChange(null))}>
                지우기
              </Button>
            )}
          </Stack>
        )}
      </Stack>
      {busy && <LinearProgress sx={{ mt: 1, maxWidth: 220 }} />}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
