/**
 * useColors Hook - O'PIED DU MONT Mobile
 * Thème : "Earth" (Terre) - Inspiré par la nature et le contexte local de Korhogo
 * Emplacement : /hooks/use-colors.ts
 * Version : 1.1 - Palette optimisée et Typage exporté
 */

import { useColorScheme } from 'react-native';

export type ThemeColors = {
  primary: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  error: string;
  warning: string;
};

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    // Primaire : Ocre/Terre cuite (Rappel de la terre rouge et de l'artisanat local)
    primary: '#B3541E',    
    
    // Background : Crème/Sable (Plus doux que le blanc pur, inspiré par la nature)
    background: '#FAF7F2', 
    
    // Surface : Papier/Parchemin léger
    surface: '#FFFFFF',    
    
    // Foreground : Brun très sombre/Anthracite (Plus naturel que le noir pur)
    foreground: '#2D241E', 
    
    // Muted : Brun grisâtre (Pour le texte secondaire)
    muted: '#8C7E74',      
    
    // Border : Argile claire
    border: '#E8E2D9',     
    
    // Success : Vert Savane/Forêt (Adaptation spécifique au contexte)
    success: '#3A5A40',    
    
    // Error : Rouge brique intense
    error: '#A4161A',      
    
    // Warning : Jaune Safran/Maïs
    warning: '#D97706',    
  },
  dark: {
    // Version sombre adaptée (Terre de Sienne profonde)
    primary: '#D9773E',
    
    // Fond : Nuit de savane (Brun-Noir très chaud)
    background: '#1A1614',
    
    // Surface : Roche volcanique
    surface: '#26211E',
    
    // Texte : Sable clair
    foreground: '#F5EEE6',
    
    // Texte secondaire : Terre séchée
    muted: '#A69689',
    
    // Bordure : Écorce sombre
    border: '#3D352F',
    
    // Success : Vert émeraude sombre
    success: '#588157',
    
    // Error : Corail brûlé
    error: '#E5383B',
    
    // Warning : Or ancien
    warning: '#F59E0B',
  },
};

/**
 * Hook personnalisé pour accéder aux couleurs du thème actuel
 */
export function useColors(): ThemeColors {
  const colorScheme = useColorScheme();
  
  // Utilise le thème système (light ou dark)
  // Par défaut : light (Thème Terre clair)
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return theme;
}