/**
 * AppContext - Global State Management for O'PIED DU MONT
 * Emplacement : racine (./app-context.tsx)
 * Version finale : Stabilisée avec gestion robuste du panier et des types
 */

import React, { createContext, useReducer, ReactNode, useContext } from 'react';
// Import des types depuis la racine
import type { AppContextType, User, CartItem, Order, MenuItem, Category, StockItem, Employee } from './types';

// ─── TYPES & ACTIONS ──────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_ITEM'; payload: { id: string; quantite: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_DATA'; payload: { 
      categories?: Category[]; 
      menuItems?: MenuItem[]; 
      stockItems?: StockItem[]; 
      employees?: Employee[] 
    } }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'INITIALIZE_DATA'; payload: any } // Pour la compatibilité avec refreshAppData
  | { type: 'RESET' };

export const initialState: AppContextType = {
  user: null,
  isLoading: false,
  error: null,
  cart: [],
  orders: [],
  menuItems: [],
  categories: [],
  stockItems: [],
  employees: [],
};

export const AppContext = createContext<{
  state: AppContextType;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

// ─── REDUCER ──────────────────────────────────────────────────────────────────

function appReducer(state: AppContextType, action: AppAction): AppContextType {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    // Support pour SET_DATA et INITIALIZE_DATA utilisé dans data-service
    case 'SET_DATA':
    case 'INITIALIZE_DATA':
      return { ...state, ...action.payload, isLoading: false };

    case 'ADD_TO_CART': {
      const currentCart = state.cart || [];
      // On vérifie si l'article (menuItemId) est déjà présent
      const existingItemIndex = currentCart.findIndex(
        (item) => item.menuItemId === action.payload.menuItemId
      );

      if (existingItemIndex > -1) {
        const updatedCart = [...currentCart];
        const item = updatedCart[existingItemIndex];
        updatedCart[existingItemIndex] = {
          ...item,
          quantity: (item.quantity || 0) + (action.payload.quantity || 1)
        };
        return { ...state, cart: updatedCart };
      }
      return { ...state, cart: [...currentCart, action.payload] };
    }

    case 'REMOVE_FROM_CART':
      return { 
        ...state, 
        cart: (state.cart || []).filter((item) => item.id !== action.payload) 
      };

    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: (state.cart || []).map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantite }
            : item
        ),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

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
    console.error('Erreur: useApp utilisé hors du AppProvider');
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}