'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useLocale, type Locale, useT } from '@/lib/i18n';

/** SET-007 화면 언어 고르기 */
export default function LanguageSwitch({ size = 'small' }: { size?: 'small' | 'medium' }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <ToggleButtonGroup exclusive size={size} value={locale} onChange={(_, v: Locale | null) => v && setLocale(v)} aria-label="language">
      <ToggleButton value="ko">{t('한국어')}</ToggleButton>
      <ToggleButton value="en">English</ToggleButton>
    </ToggleButtonGroup>
  );
}

export function LanguageCard() {
  const { t } = useLocale();
  return (
    <Paper sx={{ p: 3, maxWidth: 640, mt: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Typography variant="h4" component="h3" sx={{ flex: 1 }}>{t('화면 언어')}</Typography>
        <LanguageSwitch />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('관리자 웹 화면과 서버 안내 문구를 영어로 볼 수 있습니다. 원생 이름·알림장 본문처럼 직접 입력한 내용은 번역하지 않습니다.')}
      </Typography>
    </Paper>
  );
}
