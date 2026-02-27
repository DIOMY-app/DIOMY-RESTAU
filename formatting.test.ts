import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatDate,
  formatTime,
  formatDateTime,
  formatQuantity,
  capitalize,
  formatRole,
  formatOrderStatus,
  formatPaymentMethod,
  getStockStatus,
  formatStockStatus,
  truncateText,
} from '../formatting';

describe('Formatting Utilities', () => {
  describe('formatPrice', () => {
    it('should format price with currency', () => {
      const result = formatPrice(12.50);
      expect(result).toContain('12');
      expect(result).toContain('50');
    });

    it('should handle zero price', () => {
      const result = formatPrice(0);
      expect(result).toContain('0');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('HELLO');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('formatRole', () => {
    it('should format known roles', () => {
      expect(formatRole('admin')).toBe('Administrateur');
      expect(formatRole('manager')).toBe('Gérant');
      expect(formatRole('staff')).toBe('Personnel');
    });

    it('should capitalize unknown roles', () => {
      expect(formatRole('unknown')).toBe('Unknown');
    });
  });

  describe('formatOrderStatus', () => {
    it('should format order statuses', () => {
      expect(formatOrderStatus('pending')).toBe('En attente');
      expect(formatOrderStatus('completed')).toBe('Complété');
      expect(formatOrderStatus('cancelled')).toBe('Annulé');
    });
  });

  describe('formatPaymentMethod', () => {
    it('should format payment methods', () => {
      expect(formatPaymentMethod('cash')).toBe('Espèces');
      expect(formatPaymentMethod('card')).toBe('Carte');
      expect(formatPaymentMethod('check')).toBe('Chèque');
    });
  });

  describe('getStockStatus', () => {
    it('should return low status when quantity is at or below minimum', () => {
      expect(getStockStatus(5, 10, 30)).toBe('low');
      expect(getStockStatus(10, 10, 30)).toBe('low');
    });

    it('should return high status when quantity is at or above maximum', () => {
      expect(getStockStatus(30, 10, 30)).toBe('high');
      expect(getStockStatus(35, 10, 30)).toBe('high');
    });

    it('should return normal status when quantity is between min and max', () => {
      expect(getStockStatus(20, 10, 30)).toBe('normal');
    });
  });

  describe('formatStockStatus', () => {
    it('should format stock statuses', () => {
      expect(formatStockStatus('low')).toBe('Stock faible');
      expect(formatStockStatus('normal')).toBe('Stock normal');
      expect(formatStockStatus('high')).toBe('Stock élevé');
    });
  });

  describe('truncateText', () => {
    it('should truncate text longer than specified length', () => {
      const result = truncateText('Hello World', 5);
      expect(result).toBe('Hello...');
    });

    it('should not truncate text shorter than specified length', () => {
      const result = truncateText('Hi', 5);
      expect(result).toBe('Hi');
    });
  });

  describe('formatQuantity', () => {
    it('should format quantity with unit', () => {
      expect(formatQuantity(2.5, 'kg')).toBe('2.50 kg');
      expect(formatQuantity(10, 'pcs')).toBe('10.00 pcs');
    });
  });
});
