'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import type { Ticket } from '@/lib/platform';
import { useT } from '@/lib/i18n';

/** 티켓 대화 목록 + 답글 입력 (운영사·기관 공용) */
export default function TicketThread({ ticket, pending, onReply }: { ticket: Ticket; pending: boolean; onReply: (body: string) => void }) {
  const t = useT();
  const [body, setBody] = useState('');
  return (
    <Stack spacing={1.5}>
      {ticket.messages?.map((m) => (
        <Box key={m.id} sx={{ display: 'flex', justifyContent: m.fromOperator ? 'flex-end' : 'flex-start' }}>
          <Paper variant="outlined" sx={{ px: 1.75, py: 1.25, maxWidth: '85%', borderRadius: '14px', bgcolor: m.fromOperator ? 'background.default' : 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">
              {m.fromOperator ? t('운영팀') : m.authorName} · {dayjs(m.createdAt).format('M/D HH:mm')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.body}</Typography>
          </Paper>
        </Box>
      ))}
      <TextField multiline minRows={2} size="small" label={t('답글')} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button variant="contained" sx={{ alignSelf: 'flex-end' }} disabled={!body.trim() || pending} onClick={() => { onReply(body.trim()); setBody(''); }}>{t('보내기')}</Button>
    </Stack>
  );
}
