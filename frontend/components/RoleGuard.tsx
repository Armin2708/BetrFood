import React, { ReactNode } from 'react';
import { useRole } from '../hooks/useRole';

interface RoleGuardProps {
  /** Render children only if user has at least this role */
  minRole?: string;
  /** Render children only if user has exactly one of these roles */
  roles?: string[];
  /** Fallback to render if access is denied (optional) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's role.
 *
 * Usage:
 *   // Only admins see this
 *   <RoleGuard minRole="admin">
 *     <AdminButton />
 *   </RoleGuard>
 *
 *   // Creators and above see this
 *   <RoleGuard minRole="creator">
 *     <CreatePostButton />
 *   </RoleGuard>
 *
 *   // Only moderators or admins see this, with a fallback
 *   <RoleGuard roles={['moderator', 'admin']} fallback={<Text>No access</Text>}>
 *     <ModerationPanel />
 *   </RoleGuard>
 */
export default function RoleGuard({ minRole, roles, fallback = null, children }: RoleGuardProps) {
  const { isAtLeast, hasRole } = useRole();

  let allowed = true;

  if (minRole) {
    allowed = isAtLeast(minRole);
  } else if (roles && roles.length > 0) {
    allowed = hasRole(...roles);
  }

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
