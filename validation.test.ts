import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidName,
  isValidPrice,
  isValidQuantity,
  isValidTime,
  isValidDate,
  isNotEmpty,
  validateCartItem,
  validateOrder,
  validateMenuItem,
} from '../validation';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.valid).toBe(true);
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers');
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate phone numbers', () => {
      expect(isValidPhone('0123456789')).toBe(true);
      expect(isValidPhone('+33123456789')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('abc')).toBe(false);
    });
  });

  describe('isValidName', () => {
    it('should validate names', () => {
      expect(isValidName('John Doe')).toBe(true);
      expect(isValidName('A')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(isValidName('')).toBe(false);
      expect(isValidName('   ')).toBe(false);
    });

    it('should reject names that are too long', () => {
      expect(isValidName('a'.repeat(101))).toBe(false);
    });
  });

  describe('isValidPrice', () => {
    it('should validate positive prices', () => {
      expect(isValidPrice(10.50)).toBe(true);
      expect(isValidPrice(0.01)).toBe(true);
    });

    it('should reject zero or negative prices', () => {
      expect(isValidPrice(0)).toBe(false);
      expect(isValidPrice(-5)).toBe(false);
    });
  });

  describe('isValidQuantity', () => {
    it('should validate non-negative quantities', () => {
      expect(isValidQuantity(0)).toBe(true);
      expect(isValidQuantity(10)).toBe(true);
    });

    it('should reject negative quantities', () => {
      expect(isValidQuantity(-1)).toBe(false);
    });
  });

  describe('isValidTime', () => {
    it('should validate time format HH:mm', () => {
      expect(isValidTime('14:30')).toBe(true);
      expect(isValidTime('00:00')).toBe(true);
      expect(isValidTime('23:59')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(isValidTime('25:00')).toBe(false);
      expect(isValidTime('14:60')).toBe(false);
      expect(isValidTime('14-30')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should validate date format YYYY-MM-DD', () => {
      expect(isValidDate('2026-02-27')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(isValidDate('27-02-2026')).toBe(false);
      expect(isValidDate('2026/02/27')).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    it('should validate non-empty strings', () => {
      expect(isNotEmpty('hello')).toBe(true);
    });

    it('should reject empty or whitespace strings', () => {
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
    });
  });

  describe('validateCartItem', () => {
    it('should validate correct cart items', () => {
      const result = validateCartItem({
        menuItemId: '1',
        quantity: 2,
        price: 10.50,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject items with invalid quantity', () => {
      const result = validateCartItem({
        menuItemId: '1',
        quantity: 0,
        price: 10.50,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateOrder', () => {
    it('should validate correct orders', () => {
      const result = validateOrder({
        items: [{ id: '1', quantity: 1 }],
        total: 10.50,
        paymentMethod: 'card',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject empty orders', () => {
      const result = validateOrder({
        items: [],
        total: 0,
        paymentMethod: 'card',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid payment methods', () => {
      const result = validateOrder({
        items: [{ id: '1', quantity: 1 }],
        total: 10.50,
        paymentMethod: 'invalid',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateMenuItem', () => {
    it('should validate correct menu items', () => {
      const result = validateMenuItem({
        name: 'Steak',
        price: 18.50,
        category: 'Plats',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject items with invalid price', () => {
      const result = validateMenuItem({
        name: 'Steak',
        price: 0,
        category: 'Plats',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject items without category', () => {
      const result = validateMenuItem({
        name: 'Steak',
        price: 18.50,
        category: '',
      });
      expect(result.valid).toBe(false);
    });
  });
});
