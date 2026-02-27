/**
 * Types for O'PIED DU MONT Mobile App
 * Emplacement : racine (./types.ts)
 * Version synchronisée avec Supabase et les composants UI
 */

export interface User {
  id: string;
  nom: string;      // Remplacé 'name' par 'nom'
  telephone: string; // Remplacé 'email' par 'telephone'
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
  quantity: number; // Harmonisé avec le reducer
  notes?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'check';
  status: 'pending' | 'completed' | 'cancelled';
  statut?: 'attente' | 'paye' | 'annule'; // Ajouté pour la compatibilité UI (index.tsx)
  created_at: string; // Format Supabase
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
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
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

export interface AppContextAction {
  type: string;
  payload?: unknown;
}