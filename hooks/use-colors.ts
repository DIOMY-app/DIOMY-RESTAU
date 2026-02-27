/**
 * useColors Hook - O'PIED DU MONT Mobile
 * Centralise la palette de couleurs du restaurant
 */

import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    primary: '#0ea5e9',    // Bleu ciel (Identité restaurant)
    background: '#ffffff', // Fond blanc
    surface: '#f8fafc',    // Cartes et zones de saisie
    foreground: '#0f172a', // Texte principal (Noir/Bleu nuit)
    muted: '#64748b',      // Texte secondaire (Gris)
    border: '#e2e8f0',     // Bordures
    success: '#22c55e',    // Validation / Stock élevé
    error: '#ef4444',      // Alertes / Stock faible
    warning: '#f59e0b',    // Attention
  },
  dark: {
    primary: '#38bdf8',
    background: '#0f172a',
    surface: '#1e293b',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    border: '#334155',
    success: '#4ade80',
    error: '#f87171',
    warning: '#fbbf24',
  },
};

export function useColors() {
  const colorScheme = useColorScheme();
  
  // On récupère le thème système (light ou dark)
  // Par défaut, on utilise le thème clair si non détecté
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return theme;
}