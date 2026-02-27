/**
 * Root Layout - O'PIED DU MONT Mobile
 * Emplacement : /app/_layout.tsx
 * Gère l'initialisation globale et la structure des Providers
 */

import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';

// Imports corrigés pour la nouvelle structure (remontée d'un niveau vers la racine)
// @ts-ignore
import { AppProvider, useApp } from '../app-context'; 
// @ts-ignore
import { CartProvider } from '../context/cart-context';
// @ts-ignore
import { supabase } from '../supabase';

// Empêche le splash screen de se cacher automatiquement au démarrage
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

function AppInitializer() {
  const { dispatch } = useApp();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Chargement des données essentielles depuis Supabase
        const [
          { data: categories, error: catError },
          { data: menu, error: menuError },
          { data: stock, error: stockError },
          { data: employes, error: empError }
        ] = await Promise.all([
          supabase.from('categories').select('*').order('nom'),
          supabase.from('menu').select('*').order('nom'),
          supabase.from('stock').select('*').order('nom'),
          supabase.from('employes').select('*').order('nom')
        ]);

        if (catError || menuError || stockError || empError) {
          console.warn("Certaines données n'ont pas pu être chargées, vérifiez la connexion.");
        }

        dispatch({
          type: 'SET_DATA',
          payload: {
            categories: categories || [],
            menuItems: menu || [],
            stockItems: stock || [],
            employees: employes || []
          }
        });

      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        console.error("Erreur d'initialisation critique:", error.message);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsReady(true);
        // On cache le splash screen maintenant que tout est prêt
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    loadInitialData();

    // Gestion du temps réel pour le stock (optionnel pour la stabilité APK)
    const stockSubscription = supabase
      .channel('stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, () => {
        // On peut rafraîchir silencieusement ici si nécessaire
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stockSubscription);
    };
  }, [dispatch]);

  // Si l'app n'est pas prête, on affiche un indicateur de chargement de secours
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#8B6F47" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AppProvider>
      <CartProvider>
        <AppInitializer />
      </CartProvider>
    </AppProvider>
  );
}