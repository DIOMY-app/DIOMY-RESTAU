/**
 * AppContext - Global State Management for O'PIED DU MONT
 * Emplacement : racine (./app-context.tsx)
 * Mise à jour : Multi-Paniers + Sessions de Caisse + Synchronisation Supabase
 */

import React, { createContext, useReducer, ReactNode, useContext, useEffect } from 'react';
import { supabase } from './supabase'; // Vérifie bien que ton fichier supabase.ts est à la racine
import type { AppContextType, User, CartItem, Order, MenuItem, Category, StockItem, Employee } from './types';

// ─── EXTENSION DU TYPE POUR MULTI-PANIER & GESTION ───────────────────────────

export interface MultiCartState extends AppContextType {
  carts: { [key: number]: CartItem[] };
  activeTab: number;
  chargesFixes: any[];
  rentabilitePlats: any[];
  currentSession: any | null; // Pour stocker la session de caisse active
}

// ─── TYPES & ACTIONS ──────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACTIVE_TAB'; payload: number }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_ITEM'; payload: { id: string; quantite: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_DATA'; payload: any }
  | { type: 'SET_SESSION'; payload: any }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'RESET' };

export const initialState: MultiCartState = {
  user: null,
  isLoading: false,
  error: null,
  cart: [],
  carts: { 0: [], 1: [], 2: [] },
  activeTab: 0,
  orders: [],
  menuItems: [],
  categories: [],
  stockItems: [],
  employees: [],
  chargesFixes: [],
  rentabilitePlats: [],
  currentSession: null,
};

export const AppContext = createContext<{
  state: MultiCartState;
  dispatch: React.Dispatch<AppAction>;
  actions: { refresh: () => Promise<void> };
} | undefined>(undefined);

// ─── REDUCER ──────────────────────────────────────────────────────────────────

function appReducer(state: MultiCartState, action: AppAction): MultiCartState {
  const currentTab = state.activeTab;
  const currentCart = state.carts[currentTab] || [];

  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_SESSION':
      return { ...state, currentSession: action.payload };
    
    case 'ADD_TO_CART': {
      const existingItemIndex = currentCart.findIndex(
        (item) => item.menuItemId === action.payload.menuItemId && item.name === action.payload.name
      );
      let newCart;
      if (existingItemIndex > -1) {
        newCart = [...currentCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: (newCart[existingItemIndex].quantity || 0) + (action.payload.quantity || 1)
        };
      } else {
        newCart = [...currentCart, action.payload];
      }
      return {
        ...state,
        carts: { ...state.carts, [currentTab]: newCart },
        cart: newCart 
      };
    }

    case 'REMOVE_FROM_CART': {
      const newCart = currentCart.filter((item) => item.id !== action.payload);
      return { ...state, carts: { ...state.carts, [currentTab]: newCart }, cart: newCart };
    }

    case 'UPDATE_CART_ITEM': {
      const newCart = currentCart.map((item) =>
        item.id === action.payload.id ? { ...item, quantity: action.payload.quantite } : item
      );
      return { ...state, carts: { ...state.carts, [currentTab]: newCart }, cart: newCart };
    }

    case 'CLEAR_CART':
      return { ...state, carts: { ...state.carts, [currentTab]: [] }, cart: [] };

    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...(state.orders || [])] };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Fonction pour charger les données depuis Supabase
  const loadData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [
        { data: cats },
        { data: menu },
        { data: stock },
        { data: emps },
        { data: session }
      ] = await Promise.all([
        supabase.from('categories').select('*').order('nom'),
        supabase.from('menu').select('*').order('nom'),
        supabase.from('stock').select('*').order('nom'),
        supabase.from('employes').select('*').order('nom'),
        supabase.from('sessions_caisse').select('*').eq('statut', 'ouvert').maybeSingle()
      ]);

      dispatch({
        type: 'SET_DATA',
        payload: {
          categories: cats || [],
          menuItems: menu || [],
          stockItems: stock || [],
          employees: emps || []
        }
      });
      if (session) dispatch({ type: 'SET_SESSION', payload: session });
      
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, actions: { refresh: loadData } }}>
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}