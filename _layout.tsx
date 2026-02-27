/**
 * Root Layout - O'PIED DU MONT Mobile
 * Gère l'initialisation Supabase et l'empilement des Context Providers
 */

import { useEffect } from 'react';
import { Slot } from 'expo-router';
// @ts-ignore
import { AppProvider, useApp } from './app-context'; 
// @ts-ignore
import { CartProvider } from '../context/cart-context'; // Import du nouveau context
// @ts-ignore
import { supabase } from './supabase';

function AppInitializer() {
  const { dispatch } = useApp();

  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // Chargement parallèle pour plus de rapidité (Tables en Français)
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
          throw new Error("Erreur lors de la récupération des données.");
        }

        // On injecte tout dans le contexte global via SET_DATA
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
        console.error("Erreur d'initialisation:", error.message);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadInitialData();

    // Ecoute des changements en temps réel sur les stocks
    const stockSubscription = supabase
      .channel('stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, () => {
        loadInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stockSubscription);
    };
  }, [dispatch]);

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