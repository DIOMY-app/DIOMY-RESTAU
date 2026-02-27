/**
 * ScreenContainer - O'PIED DU MONT Mobile
 * Gère la SafeArea et le background global du projet
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';

// @ts-ignore
import { useColors } from '../hooks/use-colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: any;
}

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  const colors = useColors();

  // On définit une couleur de secours au cas où le hook colors renvoie undefined
  const backgroundColor = colors?.background || '#ffffff';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'}
        backgroundColor={backgroundColor}
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
    // Sur Android, la SafeAreaView ne gère pas toujours la barre de statut native
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
});