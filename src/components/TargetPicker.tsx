'use client';

import { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Classroom, Page, Student, Target } from '@/lib/types';

/**
 * 알림장·행사 발송 대상 (전체 / 반 / 원생 개별). 대상이 겹쳐도 백엔드가 원생 단위로 중복 제거한다.
 * 전체 대상은 원장·실장만, 교사는 담당 반과 그 반 원생만 고를 수 있다(백엔드도 검사).
 */
export default function TargetPicker({ value, onChange, disabled }: { value: Target[]; onChange: (t: Target[]) => void; disabled?: boolean }) {
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const all = value.some((t) => t.scope === 'ALL');

  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });

  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setKeyword(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  const students = useQuery({
    queryKey: ['students', instId, 'target-search', keyword],
    queryFn: () => api.get<Page<Student>>('students', { keyword, status: 'ACTIVE', size: 20 }),
    enabled: !!instId && keyword.length > 0,
  });

  const selectedClassIds = value.filter((t) => t.scope === 'CLASS').map((t) => t.id);
  const selectedStudents = value.filter((t) => t.scope === 'STUDENT');

  const toggleClass = (c: Classroom) =>
    onChange(selectedClassIds.includes(c.id) ? value.filter((t) => !(t.scope === 'CLASS' && t.id === c.id)) : [...value, { scope: 'CLASS', id: c.id, name: c.name }]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        받는 사람
      </Typography>
      {manager && (
        <FormControlLabel
          control={<Switch checked={all} disabled={disabled} onChange={(e) => onChange(e.target.checked ? [{ scope: 'ALL', id: null, name: '전체' }] : [])} />}
          label="기관 전체 (재원생 모두)"
        />
      )}
      {!all && (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              반 (여러 개 선택 가능)
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {(classes.data ?? []).map((c) => {
                const on = selectedClassIds.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    label={`${c.name}${c.headcount !== null ? ` ${c.headcount}명` : ''}`}
                    color={on ? 'primary' : 'default'}
                    variant={on ? 'filled' : 'outlined'}
                    onClick={disabled ? undefined : () => toggleClass(c)}
                  />
                );
              })}
              {classes.data?.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  선택할 수 있는 반이 없습니다
                </Typography>
              )}
            </Stack>
          </Box>
          <Autocomplete
            multiple
            disabled={disabled}
            options={(students.data?.items ?? []).map<Target>((s) => ({ scope: 'STUDENT', id: s.id, name: s.name }))}
            value={selectedStudents}
            onChange={(_, picked) => onChange([...value.filter((t) => t.scope !== 'STUDENT'), ...picked])}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            getOptionLabel={(o) => o.name ?? ''}
            filterOptions={(x) => x}
            inputValue={input}
            onInputChange={(_, v, reason) => reason !== 'reset' && setInput(v)}
            loading={students.isFetching}
            noOptionsText={keyword ? '찾는 원생이 없습니다' : '이름 또는 보호자 번호 뒷 4자리'}
            renderInput={(params) => <TextField {...params} size="small" label="원생 개별 추가" placeholder="이름 검색" />}
          />
        </Stack>
      )}
    </Box>
  );
}

/** 대상 요약: "전체" / "햇살반 외 2" */
export function targetSummary(targets: Target[]) {
  if (targets.some((t) => t.scope === 'ALL')) return '전체';
  if (targets.length === 0) return '-';
  const first = targets[0].name ?? '';
  return targets.length === 1 ? first : `${first} 외 ${targets.length - 1}`;
}

/** 요청 본문용 (name 제외) */
export const toTargetRequest = (targets: Target[]) => targets.map((t) => ({ scope: t.scope, id: t.id }));
