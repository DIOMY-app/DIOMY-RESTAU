/**
 * RoleGuard - O'PIED DU MONT
 * Protège les composants selon le rôle de l'utilisateur
 */

import React from 'react';
import { View, Text } from 'react-native';
// @ts-ignore
import { useApp } from '../app-context';

interface RoleGuardProps {
  allowedRoles: ('admin' | 'manager' | 'chef' | 'waiter' | 'cashier' | 'staff')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard = ({ allowedRoles, children, fallback }: RoleGuardProps) => {
  const { state } = useApp();
  const userRole = state.user?.role;

  // Si le rôle de l'utilisateur est dans la liste autorisée
  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // Si l'utilisateur n'a pas accès
  if (fallback) return <>{fallback}</>;

  return null; // Par défaut, on ne rend rien (cache le bouton/la section)
};