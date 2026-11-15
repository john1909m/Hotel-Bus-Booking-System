import { describe, it, expect } from 'vitest';
import {
  isChildFree,
  isChildChargeable,
  getChildAgeCategory,
  getChildAgeLabel,
  calculateGuestBreakdown,
} from './guest-rules.util';

describe('Guest Rules Utility', () => {
  describe('Age classification', () => {
    it('should classify ages 0-11 as free', () => {
      expect(isChildFree(0)).toBe(true);
      expect(isChildFree(5)).toBe(true);
      expect(isChildFree(11)).toBe(true);
      expect(isChildFree(12)).toBe(false);
      expect(isChildFree(null)).toBe(false);
      expect(isChildFree(undefined)).toBe(false);
    });

    it('should classify ages 12-17 as chargeable', () => {
      expect(isChildChargeable(12)).toBe(true);
      expect(isChildChargeable(14)).toBe(true);
      expect(isChildChargeable(17)).toBe(true);
      expect(isChildChargeable(11)).toBe(false);
      expect(isChildChargeable(18)).toBe(false);
      expect(isChildChargeable(null)).toBe(false);
    });

    it('should return correct category string', () => {
      expect(getChildAgeCategory(0)).toBe('free');
      expect(getChildAgeCategory(11)).toBe('free');
      expect(getChildAgeCategory(12)).toBe('chargeable');
      expect(getChildAgeCategory(17)).toBe('chargeable');
      expect(getChildAgeCategory(null)).toBe('unknown');
    });

    it('should generate formatted age labels with free/chargeable tags', () => {
      expect(getChildAgeLabel(0)).toBe('Under 1 (Free)');
      expect(getChildAgeLabel(5)).toBe('5 yrs (Free)');
      expect(getChildAgeLabel(11)).toBe('11 yrs (Free)');
      expect(getChildAgeLabel(12)).toBe('12 yrs (Chargeable)');
      expect(getChildAgeLabel(14)).toBe('14 yrs (Chargeable)');
      expect(getChildAgeLabel(null)).toBe('Age unknown');
    });
  });

  describe('calculateGuestBreakdown', () => {
    it('should breakdown booking with 2 adults and children aged 14 and 5', () => {
      const breakdown = calculateGuestBreakdown({
        guests: 4,
        adults: 2,
        childAges: [14, 5],
      });

      expect(breakdown.totalGuests).toBe(4);
      expect(breakdown.adultsCount).toBe(2);
      expect(breakdown.childrenCount).toBe(2);
      expect(breakdown.freeChildrenCount).toBe(1);
      expect(breakdown.chargeableChildrenCount).toBe(1);
      expect(breakdown.requiredCapacity).toBe(3); // 2 adults + 1 chargeable child (14)
      expect(breakdown.children).toEqual([
        { age: 14, isFree: false, isChargeable: true, label: '14 yrs (Chargeable)' },
        { age: 5, isFree: true, isChargeable: false, label: '5 yrs (Free)' },
      ]);
    });

    it('should fallback adults count from guests minus children if adults is omitted', () => {
      const breakdown = calculateGuestBreakdown({
        guests: 4,
        childAges: [14, 5],
      });

      expect(breakdown.adultsCount).toBe(2);
      expect(breakdown.childrenCount).toBe(2);
      expect(breakdown.requiredCapacity).toBe(3);
    });

    it('should handle adults-only booking without children', () => {
      const breakdown = calculateGuestBreakdown({
        guests: 2,
        adults: 2,
        childAges: [],
      });

      expect(breakdown.totalGuests).toBe(2);
      expect(breakdown.adultsCount).toBe(2);
      expect(breakdown.childrenCount).toBe(0);
      expect(breakdown.freeChildrenCount).toBe(0);
      expect(breakdown.chargeableChildrenCount).toBe(0);
      expect(breakdown.requiredCapacity).toBe(2);
    });

    it('should handle null or empty DTO safely', () => {
      const breakdown = calculateGuestBreakdown(null);
      expect(breakdown.totalGuests).toBe(1);
      expect(breakdown.adultsCount).toBe(1);
      expect(breakdown.childrenCount).toBe(0);
    });
  });
});

