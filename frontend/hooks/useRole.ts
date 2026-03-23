import { useContext } from 'react';
import { AuthContext } from '../context/AuthenticationContext';

const ROLE_HIERARCHY = ['user', 'creator', 'moderator', 'admin'];

function roleLevel(role: string): number {
  const index = ROLE_HIERARCHY.indexOf(role);
  return index >= 0 ? index : 0;
}

/**
 * Hook for role-based checks in any component.
 *
 * Usage:
 *   const { isAdmin, isAtLeast, role } = useRole();
 *   if (isAdmin) { ... }
 *   if (isAtLeast('moderator')) { ... }
 */
export function useRole() {
  const { user, refreshRole } = useContext(AuthContext);
  const role = user?.role || 'user';

  return {
    role,
    isUser: role === 'user',
    isCreator: role === 'creator',
    isModerator: role === 'moderator',
    isAdmin: role === 'admin',
    /** Returns true if the user's role is at or above the given minimum role */
    isAtLeast: (minRole: string) => roleLevel(role) >= roleLevel(minRole),
    /** Returns true if the user has exactly one of the given roles */
    hasRole: (...roles: string[]) => roles.includes(role),
    refreshRole,
  };
}
