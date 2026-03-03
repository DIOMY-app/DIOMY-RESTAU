/**
 * Types for O'PIED DU MONT Mobile App
 * Emplacement : racine (./types.ts)
 * Version finale : Harmonisée avec Reducer, Caisse et Supabase (Français/Anglais)
 */

export interface User {
  id: string;
  nom: string;
  telephone: string;
  role: 'admin' | 'manager' | 'staff' | 'waiter' | 'chef' | 'cashier';
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  nom?: string; // Compatibilité Supabase
  description: string;
  price: number;
  prix?: number; // Compatibilité Supabase
  category: string;
  image?: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  nom?: string; // Compatibilité Supabase
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  name: string; 
  nom?: string;      // Ajouté pour corriger l'erreur 2339
  quantity: number;
  quantite?: number; // Compatibilité Supabase
  unit: string;
  unite?: string;    // Compatibilité Supabase
  minQuantity: number;
  maxQuantity: number;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;   // Utilisé dans l'affichage UI
  quantite?: number;  // Compatibilité avec UPDATE_CART_ITEM
  notes?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'check' | 'especes' | 'wave' | 'orange_money';
  status: 'pending' | 'completed' | 'cancelled';
  statut?: 'attente' | 'paye' | 'annule'; 
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  nom: string;
  telephone: string;
  role: string;
  est_actif: boolean;
  hireDate: string;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string; 
  endTime: string; 
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  type: 'sales' | 'inventory' | 'employee';
  title: string;
  data: Record<string, unknown>;
  generatedAt: string;
}

export interface AppContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  cart: CartItem[];
  orders: Order[];
  menuItems: MenuItem[];
  categories: Category[];
  stockItems: StockItem[];
  employees: Employee[];
}

export interface AppAction {
  type: string;
  payload?: any;
}