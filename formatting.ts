/**
 * Formatting Utilities for O'PIED DU MONT Mobile
 * Adapté pour le FCFA et la robustesse mobile
 */

/**
 * Format price to currency format (FCFA)
 * @param price - Montant
 * @returns Formatted price string (ex: "12 500 FCFA")
 */
export function formatPrice(price: number): string {
  // Le FCFA n'a généralement pas de décimales en usage courant
  return `${price.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;
}

/**
 * Format date to readable format
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch (e) {
    // Fallback si Intl n'est pas supporté
    return dateObj.toLocaleDateString('fr-FR');
  }
}

/**
 * Format time to readable format
 */
export function formatTime(time: string | Date): string {
  if (typeof time === 'string') return time;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(time);
  } catch (e) {
    return time.toLocaleTimeString('fr-FR').substring(0, 5);
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(dateObj)} à ${formatTime(dateObj)}`;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  // On n'affiche les décimales que si nécessaire (ex: 2.5 kg oui, mais 15 pcs non)
  const formattedQty = Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2);
  return `${formattedQty} ${unit}`;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format roles
 */
export function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    admin: 'Administrateur',
    manager: 'Gérant',
    staff: 'Personnel',
    chef: 'Chef',
    waiter: 'Serveur',
    cashier: 'Caissier',
  };
  return roleMap[role.toLowerCase()] || capitalize(role);
}

/**
 * Format status
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'En attente',
    completed: 'Complété',
    cancelled: 'Annulé',
  };
  return statusMap[status.toLowerCase()] || capitalize(status);
}

/**
 * Format payment methods
 */
export function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte',
    check: 'Chèque',
    wave: 'Wave',
    orange_money: 'Orange Money',
  };
  return methodMap[method.toLowerCase()] || capitalize(method);
}

/**
 * Get stock status logic
 */
export function getStockStatus(quantity: number, minQuantity: number, maxQuantity: number): 'low' | 'normal' | 'high' {
  if (quantity <= minQuantity) return 'low';
  if (quantity >= maxQuantity) return 'high';
  return 'normal';
}

/**
 * Format stock status for display
 */
export function formatStockStatus(status: 'low' | 'normal' | 'high'): string {
  const statusMap: Record<string, string> = {
    low: 'Stock faible',
    normal: 'Stock normal',
    high: 'Stock élevé',
  };
  return statusMap[status] || 'Normal';
}

/**
 * Truncate text
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}