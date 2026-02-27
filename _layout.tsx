/**
 * Root Layout - O'PIED DU MONT Mobile
 * Gère l'initialisation Supabase avec protection contre les crashs au démarrage
 */

import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
// @ts-ignore
import { AppProvider, useApp } from './app-context'; 
// @ts-ignore
import { CartProvider } from '../context/cart-context';
// @ts-ignore
import { supabase } from './supabase';

// Empêche le splash screen de se cacher automatiquement
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

        // Chargement des données essentielles pour O'PIED DU MONT
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
          console.warn("Certaines données n'ont pas pu être chargées, l'app continue quand même.");
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
        // On cache le splash screen seulement quand tout est chargé
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    loadInitialData();

    // Ecoute des changements en temps réel
    const stockSubscription = supabase
      .channel('stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, () => {
        // Optionnel : ne pas recharger tout le initialData pour éviter les boucles de crash
        // loadInitialData(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stockSubscription);
    };
  }, [dispatch]);

  // Si l'app n'est pas prête, on ne rend rien (le splash screen reste affiché)
  if (!isReady) return null;

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