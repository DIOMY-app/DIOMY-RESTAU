/**
 * Cart Context - O'PIED DU MONT Mobile
 * Emplacement : /context/cart-context.tsx
 * Version : 2.0 - Typage harmonisé (nom/prix) et optimisation useMemo
 */

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// Harmonisation avec le reste du projet (Utilisation de 'nom' et 'prix')
export interface CartItem {
  id: string;
  nom: string;
  prix: number;
  quantite: number;
  // Optionnel : on peut ajouter l'image ou la catégorie si besoin plus tard
  image_url?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Ajout au panier avec détection de doublon
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id 
            ? { ...item, quantite: item.quantite + 1 } 
            : item
        );
      }
      // On mappe les champs potentiels de la DB (nom/prix) vers notre interface
      return [...prev, { 
        id: product.id, 
        nom: product.nom || product.name, 
        prix: product.prix || product.price, 
        quantite: 1,
        image_url: product.image_url 
      }];
    });
  };

  // Mise à jour de la quantité (+1 ou -1)
  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev
      .map(item =>
        item.id === id 
          ? { ...item, quantite: Math.max(0, item.quantite + delta) } 
          : item
      )
      .filter(item => item.quantite > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  // Calculs optimisés
  const totalItems = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantite, 0), 
  [cart]);

  const totalPrice = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.prix * item.quantite), 0), 
  [cart]);

  // Valeur du contexte mémorisée
  const value = useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice
  }), [cart, totalItems, totalPrice]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

/**
 * Hook personnalisé pour utiliser le panier
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}