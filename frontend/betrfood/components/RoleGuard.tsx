import React, { useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContext } from '../context/AuthenticationContext';

type RoleGuardProps = {
  /** Roles that are allowed to see the children */
  allowedRoles: string[];
  /** Optional fallback to render when the user does not have the required role */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Conditionally renders children based on the authenticated user's role.
 * Uses the role from AuthContext (fetched and cached there).
 * If the user's role is not in allowedRoles, renders the fallback (or nothing).
 */
export default function RoleGuard({ allowedRoles, fallback = null, children }: RoleGuardProps) {
  const { user } = useContext(AuthContext);

  if (!user || !user.role) {
    // Not logged in or role not yet loaded — show fallback
    return <>{fallback}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
