'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { QUESTION_TYPE, type QuestionType, type Survey } from '@/lib/comm';
import type { Target } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import TargetPicker, { toTargetRequest } from '@/components/TargetPicker';

interface Q {
  type: QuestionType;
  text: string;
  options: string[];
  required: boolean;
}
const blank = (): Q => ({ type: 'SINGLE', text: '', options: ['', ''], required: true });
const hasOptions = (t: QuestionType) => t === 'SINGLE' || t === 'MULTI';

/** NTC-010 설문 작성 — 질문 최대 20개, 선택지 최대 10개 */
export default function SurveyForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [targets, setTargets] = useState<Target[]>([]);
  const [qs, setQs] = useState<Q[]>([blank()]);

  const patch = (i: number, p: Partial<Q>) => setQs((l) => l.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const cleaned = qs.map((q) => ({ ...q, text: q.text.trim(), options: hasOptions(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : [] }));
  const valid = title.trim() && targets.length > 0 && cleaned.length > 0 && cleaned.every((q) => q.text && (!hasOptions(q.type) || q.options.length >= 2));

  const create = useMutation({
    mutationFn: () =>
      api.post<Survey>('surveys', {
        title: title.trim(),
        description: description.trim() || undefined,
        closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
        targets: toTargetRequest(targets),
        questions: cleaned,
      }),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['surveys'] });
      router.replace(`/surveys/${s.id}`);
    },
  });

  return (
    <>
      <PageHeader title="설문 만들기" menuId="NTC-010" />
      <Paper sx={{ p: 3, maxWidth: 820 }}>
        <Stack spacing={2.5}>
          <TargetPicker value={targets} onChange={setTargets} />
          <Divider />
          <TextField label="설문 제목" required value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 100 }} />
          <TextField label="안내 문구" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ maxLength: 1000 }} />
          <TextField label="마감 일시 (선택)" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ maxWidth: 260 }} />
          <Divider />
          {qs.map((q, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" sx={{ width: 40 }}>
                    Q{i + 1}
                  </Typography>
                  <TextField select size="small" value={q.type} onChange={(e) => patch(i, { type: e.target.value as QuestionType })} sx={{ minWidth: 140 }}>
                    {(Object.keys(QUESTION_TYPE) as QuestionType[]).map((t) => (
                      <MenuItem key={t} value={t}>
                        {QUESTION_TYPE[t]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel control={<Checkbox checked={q.required} onChange={(e) => patch(i, { required: e.target.checked })} />} label="필수" />
                  <span style={{ flex: 1 }} />
                  <IconButton aria-label="질문 삭제" disabled={qs.length === 1} onClick={() => setQs((l) => l.filter((_, j) => j !== i))}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
                <TextField size="small" label="질문" value={q.text} onChange={(e) => patch(i, { text: e.target.value })} inputProps={{ maxLength: 300 }} />
                {hasOptions(q.type) &&
                  q.options.map((o, k) => (
                    <Stack key={k} direction="row" spacing={1}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`선택지 ${k + 1}`}
                        value={o}
                        onChange={(e) => patch(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })}
                        inputProps={{ maxLength: 100 }}
                      />
                      <IconButton aria-label="선택지 삭제" disabled={q.options.length <= 2} onClick={() => patch(i, { options: q.options.filter((_, m) => m !== k) })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                {hasOptions(q.type) && q.options.length < 10 && (
                  <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => patch(i, { options: [...q.options, ''] })}>
                    선택지 추가
                  </Button>
                )}
                {q.type === 'RATING' && (
                  <Typography variant="caption" color="text.secondary">
                    학부모는 별 1~5개로 답합니다.
                  </Typography>
                )}
              </Stack>
            </Paper>
          ))}
          <Button startIcon={<AddIcon />} disabled={qs.length >= 20} onClick={() => setQs((l) => [...l, blank()])} sx={{ alignSelf: 'flex-start' }}>
            질문 추가
          </Button>
          {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => router.back()}>취소</Button>
            <Button variant="contained" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
              설문 보내기
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}
