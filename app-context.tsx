/**
 * AppContext - Global State Management for O'PIED DU MONT
 * Emplacement : racine (./app-context.tsx)
 * Mise à jour : Support Multi-Paniers + Gestion des Coûts & Rentabilité
 */

import React, { createContext, useReducer, ReactNode, useContext } from 'react';
import type { AppContextType, User, CartItem, Order, MenuItem, Category, StockItem, Employee } from './types';

// ─── EXTENSION DU TYPE POUR MULTI-PANIER & GESTION ───────────────────────────

export interface MultiCartState extends AppContextType {
  carts: { [key: number]: CartItem[] }; // Paniers indexés 0, 1, 2
  activeTab: number; // Onglet actif (0, 1 ou 2)
  chargesFixes: any[]; // Nouvelles données pour le calcul des coûts
  rentabilitePlats: any[]; // Données de marge par plat
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
  | { type: 'SET_DATA'; payload: { 
      categories?: Category[]; 
      menuItems?: MenuItem[]; 
      stockItems?: StockItem[]; 
      employees?: Employee[];
      chargesFixes?: any[];
      rentabilitePlats?: any[];
    } }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'INITIALIZE_DATA'; payload: any }
  | { type: 'RESET' };

export const initialState: MultiCartState = {
  user: null,
  isLoading: false,
  error: null,
  cart: [], // Gardé pour compatibilité
  carts: { 0: [], 1: [], 2: [] }, // Nos 3 clients
  activeTab: 0,
  orders: [],
  menuItems: [],
  categories: [],
  stockItems: [],
  employees: [],
  chargesFixes: [], // Initialisation vide
  rentabilitePlats: [], // Initialisation vide
};

export const AppContext = createContext<{
  state: MultiCartState;
  dispatch: React.Dispatch<AppAction>;
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
    case 'INITIALIZE_DATA':
      return { ...state, ...action.payload, isLoading: false };

    case 'ADD_TO_CART': {
      // Pour les sauces et grillades, le nom est déjà formaté par le composant Menu
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
      return {
        ...state,
        carts: { ...state.carts, [currentTab]: newCart },
        cart: newCart
      };
    }

    case 'UPDATE_CART_ITEM': {
      const newCart = currentCart.map((item) =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantite }
          : item
      );
      return {
        ...state,
        carts: { ...state.carts, [currentTab]: newCart },
        cart: newCart
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        carts: { ...state.carts, [currentTab]: [] },
        cart: []
      };

    case 'ADD_ORDER':
      return { 
        ...state, 
        orders: [action.payload, ...(state.orders || [])] 
      };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// ─── HOOKS ────────────────────────────────────────────────────────────────────

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}