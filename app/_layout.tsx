/**
 * Root Layout - O'PIED DU MONT Mobile
 * Emplacement : /app/_layout.tsx
 * Gère l'initialisation globale et le calcul du Badge Marketing
 * Version : 1.4 - Ajout du compteur de relance client
 */

import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';

// @ts-ignore
import { AppProvider, useApp } from '../app-context'; 
// @ts-ignore
import { CartProvider } from '../context/cart-context'; 
// @ts-ignore
import { supabase } from '../supabase';
import { Order } from '../types';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppInitializer() {
  const { dispatch } = useApp();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Date charnière pour le marketing (15 jours en arrière)
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const [
          { data: categories, error: catError },
          { data: menu, error: menuError },
          { data: stock, error: stockError },
          { data: employes, error: empError },
          { data: charges, error: chargesError },
          { data: rentabilite, error: rentError },
          { data: ventes, error: ventesError },
          // REQUÊTE MARKETING : Compter les clients inactifs
          { count: marketingCount, error: markError }
        ] = await Promise.all([
          supabase.from('categories').select('*').order('nom'),
          supabase.from('menu').select('*').order('nom'),
          supabase.from('stock').select('*').order('nom'),
          supabase.from('employes').select('*').order('nom'), 
          supabase.from('charges_fixes').select('*'),
          supabase.from('rentabilite_plats').select('*'),
          supabase.from('ventes').select('*').gte('creee_a', today.toISOString()).order('creee_a', { ascending: false }),
          // On ne récupère que le nombre (count) pour optimiser
          supabase.from('clients')
            .select('*', { count: 'exact', head: true })
            .lt('derniere_visite', fifteenDaysAgo.toISOString())
            .eq('actif', true)
        ]);

        if (catError || menuError || stockError || empError || chargesError || rentError || ventesError || markError) {
          console.warn("Erreurs lors du chargement des données.");
        }

        // Mise à jour du state global
        dispatch({
          type: 'SET_DATA',
          payload: {
            categories: categories || [],
            menuItems: menu || [],
            stockItems: stock || [],
            employees: employes || [],
            chargesFixes: charges || [],
            rentabilitePlats: rentabilite || [],
            orders: (ventes || []) as Order[] 
          }
        });

        // Mise à jour spécifique du compteur marketing
        // Note: Assure-toi que cette action existe dans ton reducer
        dispatch({ type: 'SET_MARKETING_COUNT', payload: marketingCount || 0 });

      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    loadInitialData();

    // TEMPS RÉEL : Mettre à jour le badge si un client est enregistré
    const marketingSubscription = supabase
      .channel('marketing-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        // Optionnel : Relancer loadInitialData ou une fonction légère de comptage
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventes' }, (payload) => {
        dispatch({ type: 'ADD_ORDER', payload: payload.new as Order });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ventes' }, (payload) => {
        dispatch({ type: 'UPDATE_ORDER', payload: payload.new as Order });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(marketingSubscription);
    };
  }, [dispatch]);

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