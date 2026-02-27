/**
 * Validation Utilities for O'PIED DU MONT Mobile
 */

/**
 * Validate email format
 * @param email - Email to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and error message
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une lettre majuscule' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  return { valid: true };
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate name (non-empty, reasonable length)
 * @param name - Name to validate
 * @returns true if valid, false otherwise
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

/**
 * Validate price (positive number)
 * @param price - Price to validate
 * @returns true if valid, false otherwise
 */
export function isValidPrice(price: number): boolean {
  return price > 0 && Number.isFinite(price);
}

/**
 * Validate quantity (non-negative number)
 * @param quantity - Quantity to validate
 * @returns true if valid, false otherwise
 */
export function isValidQuantity(quantity: number): boolean {
  return quantity >= 0 && Number.isFinite(quantity);
}

/**
 * Validate time format (HH:mm)
 * @param time - Time string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param date - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

/**
 * Validate that a value is not empty
 * @param value - Value to check
 * @returns true if not empty, false otherwise
 */
export function isNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * Validate cart item
 * @param item - Cart item to validate
 * @returns Object with validation result and error message
 */
export function validateCartItem(item: { menuItemId: string; quantity: number; price: number }): { valid: boolean; message?: string } {
  if (!item.menuItemId) {
    return { valid: false, message: 'ID du menu requis' };
  }
  if (!isValidQuantity(item.quantity) || item.quantity === 0) {
    return { valid: false, message: 'Quantité invalide' };
  }
  if (!isValidPrice(item.price)) {
    return { valid: false, message: 'Prix invalide' };
  }
  return { valid: true };
}

/**
 * Validate order
 * @param order - Order to validate
 * @returns Object with validation result and error message
 */
export function validateOrder(order: { items: any[]; total: number; paymentMethod: string }): { valid: boolean; message?: string } {
  if (!order.items || order.items.length === 0) {
    return { valid: false, message: 'La commande doit contenir au moins un article' };
  }
  if (!isValidPrice(order.total)) {
    return { valid: false, message: 'Total invalide' };
  }
  if (!['cash', 'card', 'check'].includes(order.paymentMethod)) {
    return { valid: false, message: 'Méthode de paiement invalide' };
  }
  return { valid: true };
}

/**
 * Validate menu item
 * @param item - Menu item to validate
 * @returns Object with validation result and error message
 */
export function validateMenuItem(item: { name: string; price: number; category: string }): { valid: boolean; message?: string } {
  if (!isValidName(item.name)) {
    return { valid: false, message: 'Nom invalide' };
  }
  if (!isValidPrice(item.price)) {
    return { valid: false, message: 'Prix invalide' };
  }
  if (!item.category || item.category.trim().length === 0) {
    return { valid: false, message: 'Catégorie requise' };
  }
  return { valid: true };
}
