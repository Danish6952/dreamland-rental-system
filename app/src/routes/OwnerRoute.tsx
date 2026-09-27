import { Outlet } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/States';
import { ShieldAlert } from 'lucide-react';

/** Owner-only pages. The database enforces this too (RLS + role checks). */
export function OwnerRoute() {
  const { isOwner } = useAuth();
  if (!isOwner) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-6" />}
        title="Owner only"
        message="Only the owner can open this page."
      />
    );
  }
  return <Outlet />;
}
