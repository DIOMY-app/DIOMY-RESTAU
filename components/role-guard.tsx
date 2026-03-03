/**
 * RoleGuard - O'PIED DU MONT
 * Emplacement : /components/role-guard.tsx
 * Version : Finale avec gestion de la casse des rôles
 */

import React from 'react';
import { useApp } from '../app-context';

// Définition des types de rôles autorisés dans l'application
export type AppRole = 'admin' | 'manager' | 'chef' | 'waiter' | 'cashier' | 'staff';

interface RoleGuardProps {
  /** Liste des rôles autorisés à voir le contenu */
  allowedRoles: AppRole[];
  /** Le contenu à afficher si l'accès est autorisé */
  children: React.ReactNode;
  /** Optionnel : Ce qui s'affiche si l'accès est refusé (ex: message "Accès restreint") */
  fallback?: React.ReactNode;
}

/**
 * Composant de protection basé sur le rôle utilisateur.
 * Utilisation : <RoleGuard allowedRoles={['admin', 'manager']}> <MonBouton /> </RoleGuard>
 */
export const RoleGuard = ({ allowedRoles, children, fallback }: RoleGuardProps) => {
  const { state } = useApp();
  
  // Récupération du rôle et mise en minuscule pour la comparaison
  const userRole = state.user?.role?.toLowerCase() as AppRole | undefined;

  // Vérification de l'autorisation
  const isAuthorized = userRole && allowedRoles.map(r => r.toLowerCase()).includes(userRole);

  if (isAuthorized) {
    return <>{children}</>;
  }

  // Rendu en cas d'échec d'autorisation
  if (fallback) {
    return <>{fallback}</>;
  }

  // Par défaut, on ne rend absolument rien (le composant est invisible)
  return null;
};