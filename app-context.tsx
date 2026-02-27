/**
 * AppContext - Global State Management for O'PIED DU MONT
 */

import React, { createContext, useReducer, ReactNode, useContext } from 'react';
import type { AppContextType, User, CartItem, Order } from './types';

// ─── TYPES & ACTIONS ──────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_ITEM'; payload: { id: string; quantite: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_DATA'; payload: Partial<AppContextType> }
  | { type: 'ADD_ORDER'; payload: Order }
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

    case 'SET_DATA':
      return { ...state, ...action.payload, isLoading: false };

    case 'ADD_TO_CART': {
      const existingItem = state.cart.find((item) => item.menuItemId === action.payload.menuItemId);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.menuItemId === action.payload.menuItemId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      return { ...state, cart: [...state.cart, action.payload] };
    }

    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((item) => item.id !== action.payload) };

    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantite }
            : item
        ),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}