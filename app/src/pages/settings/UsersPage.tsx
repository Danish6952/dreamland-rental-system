import { useTranslation } from 'react-i18next';
import { useUsers } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useAction } from '@/hooks/useAction';
import { adminService } from '@/services/adminService';
import type { Profile } from '@/types/models';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QueryState } from '@/components/ui/States';
import { formatDate } from '@/lib/format';

/** Owner only. New users are created in the Supabase dashboard (decision Q10). */
export default function UsersPage() {
  const { t } = useTranslation();
  const { profile: me } = useAuth();
  const users = useUsers();
  const setAccess = useAction(({ u, role, active }: { u: Profile; role: Profile['role']; active: boolean }) => adminService.setUserAccess(u.id, role, active), {
    success: 'User updated',
  });

  return (
    <div className="space-y-4">
      <PageHeader back="/settings" title="Users" />
      <QueryState query={users}>
        {(list) => (
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {list.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{u.full_name}</span>
                    <Badge tone={u.role === 'owner' ? 'gold' : 'blue'}>{t(u.role === 'owner' ? 'Owner' : 'Staff')}</Badge>
                    {!u.is_active && <Badge tone="gray">{t('Disabled')}</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t('Added')} {formatDate(u.created_at)}
                  </div>
                </div>
                {u.id !== me?.id && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={setAccess.isPending}
                      onClick={() => setAccess.mutate({ u, role: u.role === 'owner' ? 'staff' : 'owner', active: u.is_active })}
                    >
                      {t(u.role === 'owner' ? 'Make staff' : 'Make owner')}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.is_active ? 'danger' : 'primary'}
                      loading={setAccess.isPending}
                      onClick={() => setAccess.mutate({ u, role: u.role, active: !u.is_active })}
                    >
                      {t(u.is_active ? 'Disable' : 'Enable')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <Section title="Add a user">
        <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-700">
          <li>{t('Open the Supabase dashboard → Authentication → Users → Add user.')}</li>
          <li>{t('Enter their email and a temporary password, tick “Auto confirm user”.')}</li>
          <li>{t('They appear here as Staff. Share the password; they can change it via “Forgot password?”.')}</li>
        </ol>
      </Section>
    </div>
  );
}
