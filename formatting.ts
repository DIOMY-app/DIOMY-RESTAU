/**
 * Formatting Utilities for O'PIED DU MONT Mobile
 * Version ultra-robuste pour éviter les crashs toLocaleString sur Mobile
 */

/**
 * Format price to currency format (FCFA)
 * @param price - Montant
 * @returns Formatted price string (ex: "12 500 FCFA")
 */
export function formatPrice(price: number): string {
  try {
    // Sécurité si le prix n'est pas un nombre
    if (price === undefined || price === null || isNaN(price)) {
      return "0 FCFA";
    }

    // Version manuelle du formatage pour éviter les caprices de toLocaleString sur Android
    // On sépare les milliers par un espace
    const formatted = Math.floor(price)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    return `${formatted} FCFA`;
  } catch (e) {
    // Fallback ultime en cas d'erreur imprévue
    return `${price || 0} FCFA`;
  }
}

/**
 * Format date to readable format
 */
export function formatDate(date: string | Date): string {
  if (!date) return "Date inconnue";
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Vérification si la date est valide
  if (isNaN(dateObj.getTime())) return "Date invalide";

  try {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch (e) {
    // Fallback manuel simple : JJ/MM/AAAA
    const j = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const a = dateObj.getFullYear();
    return `${j}/${m}/${a}`;
  }
}

/**
 * Format time to readable format
 */
export function formatTime(time: string | Date): string {
  if (!time) return "--:--";
  const dateObj = typeof time === 'string' ? new Date(time) : time;
  
  if (isNaN(dateObj.getTime())) return "--:--";

  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch (e) {
    const h = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(date: string | Date): string {
  if (!date) return "Date inconnue";
  return `${formatDate(date)} à ${formatTime(date)}`;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  if (quantity === undefined || quantity === null) return `0 ${unit}`;
  // On n'affiche les décimales que si nécessaire
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
  if (!role) return 'Personnel';
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
  if (!status) return 'En attente';
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
  if (!method) return 'Espèces';
  const methodMap: Record<string, string> = {
    cash: 'Espèces',
    especes: 'Espèces',
    card: 'Carte',
    carte: 'Carte',
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
  const qty = quantity || 0;
  if (qty <= (minQuantity || 0)) return 'low';
  if (qty >= (maxQuantity || 9999)) return 'high';
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
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}