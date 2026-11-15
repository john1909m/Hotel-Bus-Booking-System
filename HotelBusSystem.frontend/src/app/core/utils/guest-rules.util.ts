/**
 * Single source of truth for hotel guest capacity and child age classification rules.
 * Business Rules:
 * - Children aged 0–11 stay free and do not count toward room capacity.
 * - Children aged 12–17 are chargeable and count toward room capacity.
 * - Adults (age 18+) always count toward room capacity.
 */

export interface GuestChildItem {
  age: number;
  isFree: boolean;
  isChargeable: boolean;
  label: string;
}

export interface GuestBreakdown {
  totalGuests: number;
  adultsCount: number;
  childrenCount: number;
  children: GuestChildItem[];
  freeChildrenCount: number;
  chargeableChildrenCount: number;
  requiredCapacity: number;
}

/**
 * Returns true if a child of the given age stays free (ages 0-11).
 */
export function isChildFree(age: number | null | undefined): boolean {
  return age !== null && age !== undefined && age >= 0 && age <= 11;
}

/**
 * Returns true if a child of the given age is chargeable toward room capacity (ages 12-17).
 */
export function isChildChargeable(age: number | null | undefined): boolean {
  return age !== null && age !== undefined && age >= 12 && age <= 17;
}

/**
 * Returns 'free', 'chargeable', or 'unknown' for the specified age.
 */
export function getChildAgeCategory(age: number | null | undefined): 'free' | 'chargeable' | 'unknown' {
  if (isChildFree(age)) return 'free';
  if (isChildChargeable(age)) return 'chargeable';
  return 'unknown';
}

/**
 * Returns a human-readable label with free/chargeable indication.
 * E.g. '5 yrs (Free)', '14 yrs (Chargeable)', 'Under 1 (Free)'
 */
export function getChildAgeLabel(age: number | null | undefined): string {
  if (age === null || age === undefined) return 'Age unknown';
  const ageStr = age === 0 ? 'Under 1' : `${age} yrs`;
  if (isChildFree(age)) return `${ageStr} (Free)`;
  if (isChildChargeable(age)) return `${ageStr} (Chargeable)`;
  return ageStr;
}

/**
 * Derives comprehensive guest breakdown from booking DTO fields.
 * Handles backward-compatibility when adults or childAges are missing or null.
 */
export function calculateGuestBreakdown(
  dto: { guests?: number; adults?: number; childAges?: number[] } | null | undefined
): GuestBreakdown {
  if (!dto) {
    return {
      totalGuests: 1,
      adultsCount: 1,
      childrenCount: 0,
      children: [],
      freeChildrenCount: 0,
      chargeableChildrenCount: 0,
      requiredCapacity: 1,
    };
  }

  const childAges = Array.isArray(dto.childAges) ? dto.childAges : [];
  const children: GuestChildItem[] = childAges.map((age) => {
    const numericAge = Number(age);
    return {
      age: numericAge,
      isFree: isChildFree(numericAge),
      isChargeable: isChildChargeable(numericAge),
      label: getChildAgeLabel(numericAge),
    };
  });

  const freeChildrenCount = children.filter((c) => c.isFree).length;
  const chargeableChildrenCount = children.filter((c) => c.isChargeable).length;

  let adultsCount = dto.adults;
  if (adultsCount === undefined || adultsCount === null) {
    if (dto.guests !== undefined && dto.guests !== null) {
      adultsCount = Math.max(1, dto.guests - children.length);
    } else {
      adultsCount = 1;
    }
  }

  const totalGuests = dto.guests ?? (adultsCount + children.length);
  const requiredCapacity = adultsCount + chargeableChildrenCount;

  return {
    totalGuests,
    adultsCount,
    childrenCount: children.length,
    children,
    freeChildrenCount,
    chargeableChildrenCount,
    requiredCapacity,
  };
}

