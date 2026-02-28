/**
 * Types for O'PIED DU MONT Mobile App
 * Emplacement : racine (./types.ts)
 * Version finale : Harmonisée avec Reducer, Caisse et Supabase
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
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
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
  quantite?: number;  // Ajouté pour la compatibilité avec ton Reducer (UPDATE_CART_ITEM)
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

// Correction du nom pour correspondre à l'import dans data-service
export interface AppAction {
  type: string;
  payload?: any;
}