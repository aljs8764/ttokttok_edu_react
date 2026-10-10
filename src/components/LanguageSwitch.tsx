'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useLocale, type Locale } from '@/lib/i18n';

/** SET-007 화면 언어 고르기 */
export default function LanguageSwitch({ size = 'small' }: { size?: 'small' | 'medium' }) {
  const { locale, setLocale } = useLocale();
  return (
    <ToggleButtonGroup exclusive size={size} value={locale} onChange={(_, v: Locale | null) => v && setLocale(v)} aria-label="language">
      <ToggleButton value="ko">한국어</ToggleButton>
      <ToggleButton value="en">English</ToggleButton>
    </ToggleButtonGroup>
  );
}

export function LanguageCard() {
  const { t } = useLocale();
  return (
    <Paper sx={{ p: 3, maxWidth: 640, mt: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Typography variant="h3" sx={{ flex: 1 }}>{t('화면 언어')}</Typography>
        <LanguageSwitch />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('메뉴·로그인·설정 등 주요 화면부터 영어를 지원합니다. 아직 옮기지 않은 화면과 서버 안내 문구는 한국어로 보입니다.')}
      </Typography>
    </Paper>
  );
}
