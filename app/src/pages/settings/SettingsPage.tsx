import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAction } from '@/hooks/useAction';
import { authService } from '@/services/authService';
import { setLanguage } from '@/lib/i18n';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section, InfoRow } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { profile, isOwner, session, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const lang = (i18n.language === 'ur' ? 'ur' : 'en') as 'en' | 'ur';

  const save = useAction(
    async (next: { full_name: string; preferred_language: 'en' | 'ur' }) => {
      await authService.updateOwnProfile(profile!.id, next);
      await refreshProfile();
    },
    { success: 'Saved' },
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />
      <Section title="My profile">
        <div className="space-y-4">
          <dl>
            <InfoRow label="Email">{session?.user.email}</InfoRow>
            <InfoRow label="Role">{t(isOwner ? 'Owner' : 'Staff')}</InfoRow>
          </dl>
          <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            variant="navy"
            loading={save.isPending}
            disabled={name.trim().length < 1 || name === profile?.full_name}
            onClick={() => save.mutate({ full_name: name.trim(), preferred_language: lang })}
          >
            {t('Save name')}
          </Button>
        </div>
      </Section>

      <Section title="Language">
        <SegmentedControl
          value={lang}
          onChange={(v) => {
            if (!v) return;
            void setLanguage(v);
            save.mutate({ full_name: profile!.full_name, preferred_language: v });
          }}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ur', label: 'اردو (Urdu)' },
          ]}
        />
        <p className="mt-2 text-xs text-slate-500">{t('Urdu translation is partial in Phase 1 and will be completed in Phase 2.')}</p>
      </Section>

      <Section title="Administration">
        <ul className="divide-y divide-slate-100">
          {[
            ...(isOwner
              ? [
                  { to: '/settings/users', label: 'Users' },
                  { to: '/settings/payment-methods', label: 'Payment methods' },
                ]
              : []),
            { to: '/settings/audit-log', label: 'Audit log' },
          ].map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="flex items-center justify-between py-3 font-medium hover:text-navy-700">
                {t(l.label)} <ChevronRight className="size-4 text-slate-300 rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="About">
        <dl>
          <InfoRow label="Company">Dreamland</InfoRow>
          <InfoRow label="Location">Aari Syedan, Islamabad</InfoRow>
          <InfoRow label="Version">1.0 (Phase 1)</InfoRow>
        </dl>
      </Section>
    </div>
  );
}
