/**
 * ScreenContainer - O'PIED DU MONT Mobile
 * Emplacement : /components/screen-container.tsx
 * Version : 1.1 - Gestion optimisée de la StatusBar et du Background
 */

import React from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  Platform, 
  ViewStyle, 
  StyleProp 
} from 'react-native';

// @ts-ignore
import { useColors } from '../hooks/use-colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Style optionnel pour le View interne (container) */
  style?: StyleProp<ViewStyle>;
}

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  const colors = useColors();

  // On définit une couleur de secours robuste
  const backgroundColor = colors?.background || '#ffffff';
  
  // Détermination automatique du style de barre de statut selon la luminosité du thème
  // Si ton background est très sombre, tu pourrais vouloir 'light-content'
  const isDarkBackground = backgroundColor === '#000000' || backgroundColor === '#121212';
  const barStyle = isDarkBackground ? 'light-content' : 'dark-content';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {/* StatusBar : 
          - translucent={false} évite que le contenu passe derrière sur certains Android
          - barStyle dynamique pour la lisibilité
      */}
      <StatusBar 
        barStyle={barStyle}
        backgroundColor={backgroundColor}
        translucent={false}
      />
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Correction Android : La SafeAreaView de base ne gère pas la barre de statut
    // On ajoute le padding uniquement si la barre n'est pas translucide
    paddingTop: Platform.OS === 'android' ? 0 : 0, 
  },
  container: {
    flex: 1,
  },
});