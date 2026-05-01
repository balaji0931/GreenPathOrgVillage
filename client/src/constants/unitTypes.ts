/**
 * Unit type definitions — shared constants for the platform.
 * These are the 5 supported organization types.
 */
export interface UnitTypeInfo {
  code: string;
  name: string;
  helper: string;
}

export const UNIT_TYPES: UnitTypeInfo[] = [
  { code: 'gram_panchayat', name: 'Gram Panchayat', helper: 'Rural villages and panchayat-level governance' },
  { code: 'municipality', name: 'Municipality / ULB', helper: 'Towns, cities, and urban local bodies' },
  { code: 'apartment', name: 'Apartment / Gated Community', helper: 'Housing societies, RWAs, gated layouts' },
  { code: 'township', name: 'Township / Layout', helper: 'Private townships, plotted communities, SEZs' },
  { code: 'institution_campus', name: 'Institution / Campus', helper: 'Universities, hospitals, hotels, markets' },
];
