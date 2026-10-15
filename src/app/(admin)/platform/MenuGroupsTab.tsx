'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { MenuGroup } from '@/lib/menus';
import type { PlatformInstitution } from '@/lib/platform';
import { NAV } from '@/components/shell/nav';
import { useT } from '@/lib/i18n';

/** 메뉴 그룹으로 끌 수 있는 메뉴 (설정·문의 같은 필수 메뉴 제외) */
const TOGGLEABLE = NAV.flatMap((g) => g.items.filter((i) => !i.required).map((i) => i.href));

/** 메뉴 트리 — 체크 = 켬. 그룹 체크박스로 하위 메뉴를 한 번에 켜고 끈다 */
function MenuTree({ disabled, onChange }: { disabled: Set<string>; onChange: (next: Set<string>) => void }) {
  const t = useT();
  const toggle = (hrefs: string[], on: boolean) => {
    const next = new Set(disabled);
    hrefs.forEach((h) => (on ? next.delete(h) : next.add(h)));
    onChange(next);
  };
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => onChange(new Set())}>{t('모두 켜기')}</Button>
        <Button size="small" variant="outlined" onClick={() => onChange(new Set(TOGGLEABLE))}>{t('모두 끄기')}</Button>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {t('켠 메뉴 {0} / {1}', { 0: TOGGLEABLE.filter((h) => !disabled.has(h)).length, 1: TOGGLEABLE.length })}
        </Typography>
      </Stack>
      {NAV.map((g) => {
        const hrefs = g.items.filter((i) => !i.required).map((i) => i.href);
        const on = hrefs.filter((h) => !disabled.has(h)).length;
        return (
          <Box key={g.group} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
            <FormControlLabel
              label={<Typography variant="subtitle2">{t(g.group)}</Typography>}
              control={
                <Checkbox
                  checked={hrefs.length > 0 && on === hrefs.length}
                  indeterminate={on > 0 && on < hrefs.length}
                  disabled={hrefs.length === 0}
                  onChange={(e) => toggle(hrefs, e.target.checked)}
                />
              }
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, pl: 3 }}>
              {g.items.map((i) => (
                <FormControlLabel
                  key={i.href}
                  label={
                    <Typography variant="body2">
                      {t(i.label)}
                      {i.required && <Typography component="span" variant="caption" color="text.secondary"> {t('(필수)')}</Typography>}
                      {i.managerOnly && <Typography component="span" variant="caption" color="text.secondary"> {t('(원장·실장)')}</Typography>}
                    </Typography>
                  }
                  control={
                    <Checkbox size="small" checked={i.required || !disabled.has(i.href)} disabled={i.required} onChange={(e) => toggle([i.href], e.target.checked)} />
                  }
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function GroupDialog({ group, onClose }: { group: MenuGroup | null; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [disabled, setDisabled] = useState(() => new Set(group?.disabledMenus ?? []));
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: description.trim() || null, disabledMenus: [...disabled] };
      return group ? api.put(`platform/menu-groups/${group.id}`, body) : api.post('platform/menu-groups', body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      onClose();
    },
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{group ? t('메뉴 그룹 수정') : t('메뉴 그룹 추가')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {save.error && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label={t('그룹 이름')} value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} required autoFocus sx={{ minWidth: 220 }} />
            <TextField size="small" fullWidth label={t('설명')} value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ maxLength: 200 }} />
          </Stack>
          {group && group.institutions.length > 0 && (
            <Alert severity="info">{t('이 그룹을 쓰는 기관 {0}곳에 바로 적용됩니다.', { 0: group.institutions.length })}</Alert>
          )}
          <MenuTree disabled={disabled} onChange={setDisabled} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>{t('저장')}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** 그룹에 기관 매핑 — 체크한 기관이 이 그룹을 쓴다 (다른 그룹에 있던 기관은 옮겨 온다) */
function MappingDialog({ group, onClose }: { group: MenuGroup; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [kw, setKw] = useState('');
  const [selected, setSelected] = useState(() => new Set(group.institutions.map((i) => i.id)));
  const q = useQuery({ queryKey: ['platform', 'institutions', '', ''], queryFn: () => api.get<PlatformInstitution[]>('platform/institutions', { status: '', q: '' }) });
  const rows = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return (q.data ?? []).filter((i) => !k || i.name.toLowerCase().includes(k) || i.ownerName.toLowerCase().includes(k));
  }, [q.data, kw]);
  const save = useMutation({
    mutationFn: () => api.put(`platform/menu-groups/${group.id}/institutions`, { institutionIds: [...selected] }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform'] });
      onClose();
    },
  });
  const flip = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('{0} — 기관 매핑', { 0: group.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {(save.error ?? q.error) && <Alert severity="error">{errorMessage(save.error ?? q.error)}</Alert>}
          <TextField size="small" label={t('기관·대표명 검색')} value={kw} onChange={(e) => setKw(e.target.value)} />
          <Typography variant="caption" color="text.secondary">{t('{0}곳 선택 · 선택을 풀면 그 기관은 모든 메뉴를 씁니다.', { 0: selected.size })}</Typography>
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {rows.map((i) => (
              <Stack key={i.id} direction="row" alignItems="center" spacing={1}>
                <FormControlLabel
                  sx={{ flex: 1, mr: 0 }}
                  control={<Checkbox size="small" checked={selected.has(i.id)} onChange={() => flip(i.id)} />}
                  label={<Typography variant="body2">{i.name} <Typography component="span" variant="caption" color="text.secondary">{i.ownerName}</Typography></Typography>}
                />
                {i.menuGroupId && i.menuGroupId !== group.id && <Chip size="small" variant="outlined" label={i.menuGroupName} />}
              </Stack>
            ))}
            {q.data && rows.length === 0 && <Typography variant="body2" color="text.secondary">{t('기관이 없습니다')}</Typography>}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={save.isPending || !q.data} onClick={() => save.mutate()}>{t('저장')}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** SAAS-008 기관별 메뉴 그룹 — 그룹마다 켤 메뉴를 고르고 기관을 매핑한다 */
export default function MenuGroupsTab() {
  const t = useT();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MenuGroup | 'new' | null>(null);
  const [mapping, setMapping] = useState<MenuGroup | null>(null);
  const q = useQuery({ queryKey: ['platform', 'menu-groups'], queryFn: () => api.get<MenuGroup[]>('platform/menu-groups') });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`platform/menu-groups/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platform'] }),
  });
  const confirmRemove = (g: MenuGroup) => {
    const msg = g.institutions.length > 0
      ? t('\'{0}\' 그룹을 지울까요? 이 그룹을 쓰는 기관 {1}곳은 모든 메뉴를 쓰게 됩니다.', { 0: g.name, 1: g.institutions.length })
      : t('\'{0}\' 그룹을 지울까요?', { 0: g.name });
    if (window.confirm(msg)) remove.mutate(g.id);
  };
  return (
    <>
      {(q.error ?? remove.error) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error ?? remove.error)}</Alert>}
      <Paper sx={{ overflowX: 'auto', pt: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 3, pb: 2, position: 'sticky', left: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {t('그룹에 매핑되지 않은 기관은 모든 메뉴를 씁니다. 설정·문의하기는 끌 수 없습니다.')}
          </Typography>
          <Button variant="contained" onClick={() => setEditing('new')}>{t('메뉴 그룹 추가')}</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>{t('그룹')}</TableCell><TableCell>{t('메뉴')}</TableCell><TableCell>{t('매핑 기관')}</TableCell><TableCell align="right" /></TableRow>
          </TableHead>
          <TableBody>
            {q.data?.map((g) => {
              const off = g.disabledMenus.filter((h) => TOGGLEABLE.includes(h)).length;
              return (
                <TableRow key={g.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.name}</Typography>
                    {g.description && <Typography variant="caption" color="text.secondary">{g.description}</Typography>}
                  </TableCell>
                  <TableCell>
                    {off === 0
                      ? <Chip size="small" color="success" label={t('모든 메뉴')} />
                      : <Chip size="small" label={t('{0}개 끔', { 0: off })} />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {g.institutions.length === 0 ? '-' : g.institutions.slice(0, 3).map((i) => i.name).join(', ') + (g.institutions.length > 3 ? t(' 외 {0}곳', { 0: g.institutions.length - 3 }) : '')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setEditing(g)}>{t('메뉴 설정')}</Button>
                    <Button size="small" onClick={() => setMapping(g)}>{t('기관 매핑')}</Button>
                    <Button size="small" color="error" onClick={() => confirmRemove(g)}>{t('삭제')}</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {q.data?.length === 0 && <TableRow><TableCell colSpan={4} align="center">{t('메뉴 그룹이 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {editing && <GroupDialog group={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {mapping && <MappingDialog group={mapping} onClose={() => setMapping(null)} />}
    </>
  );
}
