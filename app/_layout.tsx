/**
 * Root Layout - O'PIED DU MONT Mobile
 * Emplacement : /app/_layout.tsx
 * Gère l'initialisation globale et la structure des Providers
 * Version : Ajout du chargement des données de rentabilité et charges fixes
 */

import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';

// Importations recalibrées sur ta structure racine (Règle n°3)
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
        // Ajout des tables de charges et rentabilité pour le Tchiep et autres plats
        const [
          { data: categories, error: catError },
          { data: menu, error: menuError },
          { data: stock, error: stockError },
          { data: employes, error: empError },
          { data: charges, error: chargesError },
          { data: rentabilite, error: rentError }
        ] = await Promise.all([
          supabase.from('categories').select('*').order('nom'),
          supabase.from('menu').select('*').order('nom'),
          supabase.from('stock').select('*').order('nom'),
          supabase.from('employes').select('*').order('nom'),
          supabase.from('charges_fixes').select('*'),
          supabase.from('rentabilite_plats').select('*')
        ]);

        if (catError || menuError || stockError || empError || chargesError || rentError) {
          console.warn("Certaines données n'ont pas pu être chargées, vérifiez la connexion ou les tables SQL.");
        }

        dispatch({
          type: 'SET_DATA',
          payload: {
            categories: categories || [],
            menuItems: menu || [],
            stockItems: stock || [],
            employees: employes || [],
            // On peut ajouter ces données au state global si ton Reducer est prêt
            chargesFixes: charges || [],
            rentabilitePlats: rentabilite || []
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

    // Gestion du temps réel pour le stock et les charges
    const stockSubscription = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, () => {
        // Rafraîchir si nécessaire
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges_fixes' }, () => {
        // Rafraîchir les charges en temps réel
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