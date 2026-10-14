'use client';

import { Suspense, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import { useSession, useSwitchInstitution, logout } from '@/lib/session';
import { useLocale } from '@/lib/i18n';
import { ROLE_LABEL } from '@/lib/format';
import { useSampleInstitution, useStartSample } from '@/components/SampleModeBanner';
import { ops as OPS, sidebar as INST, tone } from '@/theme/tokens';
import { NAV, OPS_NAV, findNav, type NavGroup, type NavItem } from './nav';
import { useDisabledMenus } from '@/lib/menus';

export const SIDEBAR_WIDTH = 232;

type Variant = 'inst' | 'ops';
const PALETTE = {
  inst: { bg: INST.bg, card: INST.card, cardBorder: INST.cardBorder, dashed: INST.dashed, group: INST.groupLabel, sub: INST.subText, item: INST.item, activeFg: INST.activeFg, logoBg: INST.logoBg, avatarBg: tone.coral.bg, avatarFg: tone.coral.fg },
  ops: { bg: OPS.main, card: OPS.card, cardBorder: OPS.dashed, dashed: OPS.dashed, group: OPS.groupLabel, sub: OPS.subText, item: OPS.item, activeFg: OPS.activeFg, logoBg: OPS.logoBg, avatarBg: tone.green.bg, avatarFg: tone.green.fg },
} as const;

/**
 * 사이드바 (디자인 Sidebar / OpsSidebar). 남색 232px, 로고, 기관 전환, 메뉴 그룹, 하단 사용자 카드.
 * 메뉴 노출은 기존 권한 로직(managerOnly = 원장·실장)을 그대로 쓰고, 메뉴 그룹(SAAS-008)에서 끈 메뉴는 뺀다.
 */
export default function Sidebar({ variant, platformAdmin, onNavigate, onChangePassword }: {
  variant: Variant;
  platformAdmin: boolean;
  onNavigate: () => void;
  onChangePassword: () => void;
}) {
  const p = PALETTE[variant];
  const { t } = useLocale();
  const pathname = usePathname();
  const { manager } = useSession();
  const groups = variant === 'ops' ? OPS_NAV : NAV;
  const activeHref = variant === 'inst' ? findNav(pathname)?.item.href : null;
  const { disabled } = useDisabledMenus();

  return (
    <Box
      component="nav"
      aria-label={variant === 'ops' ? t('운영사 메뉴') : t('주 메뉴')}
      sx={{ bgcolor: p.bg, color: '#FFFFFF', minHeight: '100%', px: 2, py: 3, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1 }}>
        <Box aria-hidden sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: p.logoBg, color: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
          똑
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <Box component="span" sx={{ fontWeight: 700, fontSize: 18 }}>
            {variant === 'ops' ? `${t('똑똑')} Ops` : t('똑똑')}
          </Box>
          <Box component="span" sx={{ fontSize: 11, color: p.sub, letterSpacing: variant === 'ops' ? '0.08em' : '0.12em' }}>
            {variant === 'ops' ? t('운영사 백오피스') : 'ADMIN'}
          </Box>
        </Box>
      </Box>

      {variant === 'inst' && <InstitutionSwitcher palette={p} />}

      {variant === 'ops' ? (
        <Suspense fallback={<NavGroups groups={groups} isActive={() => false} palette={p} manager={manager} onNavigate={onNavigate} />}>
          <OpsNavGroups palette={p} manager={manager} onNavigate={onNavigate} />
        </Suspense>
      ) : (
        <NavGroups groups={groups} isActive={(i) => i.href === activeHref} palette={p} manager={manager} hidden={disabled} onNavigate={onNavigate} />
      )}

      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {variant === 'inst' && platformAdmin && (
          <DashedLink href="/platform" palette={p} onNavigate={onNavigate}>
            {t('운영사 백오피스로 이동')} →
          </DashedLink>
        )}
        {variant === 'ops' && (
          <DashedLink href="/dashboard" palette={p} onNavigate={onNavigate}>
            ← {t('기관 어드민 보기')}
          </DashedLink>
        )}
        <UserCard palette={p} onChangePassword={onChangePassword} />
      </Box>
    </Box>
  );
}

type Pal = (typeof PALETTE)[Variant];

function NavGroups({ groups, isActive, palette: p, manager, hidden, onNavigate }: {
  groups: NavGroup[];
  isActive: (i: NavItem) => boolean;
  palette: Pal;
  manager: boolean;
  /** 메뉴 그룹(SAAS-008)에서 끈 메뉴 */
  hidden?: Set<string>;
  onNavigate: () => void;
}) {
  const { t } = useLocale();
  return (
    <>
      {groups.map((g) => {
        const items = g.items.filter((i) => (!i.managerOnly || manager) && !hidden?.has(i.href));
        if (items.length === 0) return null;
        return (
          <Box key={g.group} sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Box sx={{ fontSize: 11, color: p.group, letterSpacing: '0.08em', px: 1.5, pb: 0.75 }}>{t(g.group)}</Box>
            {items.map((i) => {
              const active = isActive(i);
              return (
                <Box
                  key={i.href}
                  component={NextLink}
                  href={i.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    minHeight: 40,
                    px: 1.5,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: 14,
                    bgcolor: active ? '#FFFFFF' : 'transparent',
                    color: active ? p.activeFg : p.item,
                    fontWeight: active ? 600 : 400,
                    '& svg': { fontSize: 18 },
                    '&:hover': { bgcolor: active ? '#FFFFFF' : 'rgba(255,255,255,0.08)', color: active ? p.activeFg : '#FFFFFF' },
                    '&:focus-visible': { outline: '2px solid #FFFFFF', outlineOffset: 2 },
                  }}
                >
                  {i.icon}
                  {t(i.label)}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </>
  );
}

/** 운영 콘솔 메뉴: 활성 항목은 ?tab= 으로 판단 (useSearchParams → Suspense 안) */
function OpsNavGroups(props: { palette: Pal; manager: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'metrics';
  return (
    <NavGroups
      groups={OPS_NAV}
      isActive={(i) => pathname === '/platform' && i.href === `/platform?tab=${tab}`}
      {...props}
    />
  );
}

function DashedLink({ href, palette: p, onNavigate, children }: { href: string; palette: Pal; onNavigate: () => void; children: ReactNode }) {
  return (
    <Box
      component={NextLink}
      href={href}
      onClick={onNavigate}
      sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 40, px: 1.5, borderRadius: '8px', border: `1px dashed ${p.dashed}`, color: p.sub, textDecoration: 'none', fontSize: 12, '&:hover': { color: '#FFFFFF' } }}
    >
      {children}
    </Box>
  );
}

/** 기관 전환 — 기존 useSwitchInstitution 로직 그대로. 소속이 하나면 이름만 보인다 */
function InstitutionSwitcher({ palette: p }: { palette: Pal }) {
  const { t } = useLocale();
  const { session } = useSession();
  const switchInst = useSwitchInstitution();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const memberships = session?.user.memberships ?? [];
  const current = session?.institution;
  const many = memberships.length > 1;

  const body = (
    <>
      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.3, minWidth: 0 }}>
        <Box component="span" sx={{ fontSize: 11, color: p.sub }}>{t('현재 기관')}</Box>
        <Box component="span" sx={{ fontWeight: 600, fontSize: 14, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.institutionName ?? '—'}
        </Box>
      </Box>
      {many && <ExpandMoreIcon sx={{ fontSize: 18 }} aria-hidden />}
    </>
  );
  const boxSx = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 44, px: 1.5, py: 0.75, borderRadius: '8px', border: `1px solid ${p.cardBorder}`, bgcolor: p.card, color: '#FFFFFF', width: '100%', textAlign: 'left' } as const;

  if (!many) return <Box sx={boxSx}>{body}</Box>;
  return (
    <>
      <ButtonBase
        aria-label={t('기관 전환')}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ ...boxSx, fontFamily: 'inherit', '&:focus-visible': { outline: '2px solid #FFFFFF', outlineOffset: 2 } }}
      >
        {body}
      </ButtonBase>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 240 } } }}>
        {memberships.map((m) => {
          const selected = m.institutionId === current?.institutionId;
          return (
            <MenuItem
              key={m.institutionId}
              selected={selected}
              disabled={switchInst.isPending}
              onClick={() => {
                setAnchor(null);
                if (!selected) switchInst.mutate(m.institutionId);
              }}
            >
              <ListItemText primary={m.institutionName} secondary={t(ROLE_LABEL[m.role])} />
              {selected && <CheckIcon fontSize="small" sx={{ ml: 1 }} aria-hidden />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

/** 하단 사용자 카드 — 누르면 계정 메뉴(비밀번호 변경·샘플 체험·언어·로그아웃, 기존 상단 메뉴와 같음) */
function UserCard({ palette: p, onChangePassword }: { palette: Pal; onChangePassword: () => void }) {
  const { t, locale, setLocale } = useLocale();
  const { session, manager } = useSession();
  const switchInst = useSwitchInstitution();
  const sample = useSampleInstitution();
  const startSample = useStartSample();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const name = session?.user.name ?? '';
  const role = session?.institution ? t(ROLE_LABEL[session.institution.role]) : '';

  return (
    <>
      <ButtonBase
        aria-label={t('계정')}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.25, p: 1.5, borderRadius: '10px', bgcolor: p.card, color: '#FFFFFF', width: '100%', textAlign: 'left', fontFamily: 'inherit', '&:focus-visible': { outline: '2px solid #FFFFFF', outlineOffset: 2 } }}
      >
        <Box aria-hidden sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', bgcolor: p.avatarBg, color: p.avatarFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          {name.slice(0, 1)}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35, fontSize: 13, minWidth: 0 }}>
          <Box component="span" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Box>
          <Box component="span" sx={{ color: p.sub, fontSize: 12 }}>{role}</Box>
        </Box>
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onChangePassword();
          }}
        >
          {t('비밀번호 변경')}
        </MenuItem>
        {manager && (
          <MenuItem
            disabled={startSample.isPending}
            onClick={() => {
              setAnchor(null);
              const mine = sample.data?.sample;
              if (mine) switchInst.mutate(mine.institutionId);
              else startSample.mutate();
            }}
          >
            {t(sample.data?.sample ? '체험 기관으로 이동' : '샘플 데이터로 체험하기')}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setLocale(locale === 'ko' ? 'en' : 'ko');
          }}
        >
          {t('언어')}: {locale === 'ko' ? t('English로 바꾸기') : t('한국어로 바꾸기')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => void logout()}>{t('로그아웃')}</MenuItem>
      </Menu>
    </>
  );
}
