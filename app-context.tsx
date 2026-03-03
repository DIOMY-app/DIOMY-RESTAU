/**
 * AppContext - Global State Management for O'PIED DU MONT
 * Emplacement : racine (./app-context.tsx)
 * Version : 3.5 - Synchronisation Marketing (Relance 30 jours)
 * Règle n°2 : Code complet fourni.
 */

import React, { createContext, useReducer, ReactNode, useContext, useEffect } from 'react';
import { supabase } from './supabase'; 
import type { AppContextType, User, CartItem, Order, MenuItem, Category, StockItem, Employee } from './types';

// ─── EXTENSION DU TYPE ───────────────────────────────────────────────────────

export interface MultiCartState extends AppContextType {
  carts: { [key: number]: CartItem[] };
  activeTab: number;
  chargesFixes: any[];
  rentabilitePlats: any[];
  currentSession: any | null; 
  activeCashierId: string | null; 
  marketingCount: number; // Badge pour la relance client
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
  | { type: 'SWITCH_CASHIER'; payload: string } 
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'SET_MARKETING_COUNT'; payload: number }
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
  activeCashierId: null,
  marketingCount: 0,
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
      return { 
        ...state, 
        currentSession: action.payload,
        activeCashierId: action.payload ? action.payload.employe_id : state.activeCashierId 
      };
    
    case 'SWITCH_CASHIER':
      return { ...state, activeCashierId: action.payload };

    case 'SET_MARKETING_COUNT':
      return { ...state, marketingCount: action.payload };

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

    case 'ADD_ORDER': {
      const exists = state.orders.some(o => o.id === action.payload.id);
      if (exists) return state;
      return { ...state, orders: [action.payload, ...(state.orders || [])] };
    }

    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map((o) => 
          o.id === action.payload.id ? action.payload : o
        )
      };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const loadData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Calcul pour la relance client : 30 jours (Règle n°3 : Analyse historique)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        { data: cats },
        { data: menu },
        { data: stock },
        { data: emps },
        { data: session },
        { data: charges },
        { count: mCount }
      ] = await Promise.all([
        supabase.from('categories').select('*').order('nom'),
        supabase.from('menu').select('*').order('nom'),
        supabase.from('stock').select('*').order('nom'),
        supabase.from('employes').select('*').order('nom'),
        supabase.from('sessions_caisse').select('*').eq('statut', 'ouvert').maybeSingle(),
        supabase.from('charges_fixes').select('*').order('nom'),
        // Requête marketing : compte les clients inactifs depuis 30 jours
        supabase.from('clients')
          .select('*', { count: 'exact', head: true })
          .or(`derniere_commande.lt.${thirtyDaysAgo.toISOString()},derniere_commande.is.null`)
          .eq('actif', true)
      ]);

      dispatch({
        type: 'SET_DATA',
        payload: {
          categories: cats || [],
          menuItems: menu || [],
          stockItems: stock || [],
          employees: emps || [],
          chargesFixes: charges || [],
          marketingCount: mCount || 0
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