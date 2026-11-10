import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function PageLoader({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-mint border-t-brand" aria-hidden="true" />
      <p className="text-label-lg font-medium text-muted">{label}</p>
    </div>
  );
}

interface RequireAuthProps {
  children: ReactNode;
  roles?: Role[];
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session" />;
  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <>{children}</>;
}

export function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  return <RequireAuth roles={roles}>{children}</RequireAuth>;
}
