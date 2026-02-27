/**
 * Types for O'PIED DU MONT Mobile App
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
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
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'check';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive';
  hireDate: string;
  createdAt: string;
  updatedAt: string;
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
