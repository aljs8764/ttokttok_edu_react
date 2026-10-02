import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import PageHeader from './PageHeader';

/** 백엔드 API 는 준비됐고 화면은 다음 단계에서 만드는 메뉴 */
export default function ComingSoon({ title, menuId, apis }: { title: string; menuId: string; apis: string[] }) {
  return (
    <>
      <PageHeader title={title} menuId={menuId} />
      <Paper sx={{ p: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          화면 준비 중입니다
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          백엔드 API 는 구현되어 있습니다:
        </Typography>
        <Typography component="ul" variant="body2" color="text.secondary" sx={{ m: 0, pl: 2.5 }}>
          {apis.map((a) => (
            <li key={a}>
              <code>{a}</code>
            </li>
          ))}
        </Typography>
      </Paper>
    </>
  );
}
