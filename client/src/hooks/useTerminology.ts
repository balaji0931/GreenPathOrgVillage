/**
 * useTerminology — Production-grade i18n-based terminology hook
 * 
 * Provides context-aware labels and a smart t() wrapper that resolves
 * type-specific nested translation keys automatically.
 * 
 * Two inputs → one lookup → correct label in correct language:
 *   Language (from i18n)  + Unit Type (from DB) → UI label
 * 
 * Usage:
 *   const { tt, label } = useTerminology(villageData?.unitType);
 *   
 *   // Smart t() - tries "key.apartment" first, falls back to "key"
 *   tt('manager.totalHouseholds')  → "Total Flats" (en+apartment)
 *   
 *   // Direct label access
 *   label.household → "Flat"
 *   label.householdPlural → "Flats"
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface TerminologyLabels {
  org: string;
  orgPlural: string;
  household: string;
  householdPlural: string;
  headName: string;
  houseNumber: string;
  ward: string;
  wardPlural: string;
  collector: string;
  collectorPlural: string;
  familySize: string;
  address: string;
  session: string;
  sessionPlural: string;
}

export function useTerminology(unitType?: string | null) {
  const { t, i18n } = useTranslation();
  const type = unitType || 'gram_panchayat';
  const lang = i18n.language;

  return useMemo(() => {
    // Direct label access from terminology section
    const label: TerminologyLabels = {
      org: t(`terminology.${type}.org`, { defaultValue: '' }) || t('terminology.gram_panchayat.org'),
      orgPlural: t(`terminology.${type}.orgPlural`, { defaultValue: '' }) || t('terminology.gram_panchayat.orgPlural'),
      household: t(`terminology.${type}.household`, { defaultValue: '' }) || t('terminology.gram_panchayat.household'),
      householdPlural: t(`terminology.${type}.householdPlural`, { defaultValue: '' }) || t('terminology.gram_panchayat.householdPlural'),
      headName: t(`terminology.${type}.headName`, { defaultValue: '' }) || t('terminology.gram_panchayat.headName'),
      houseNumber: t(`terminology.${type}.houseNumber`, { defaultValue: '' }) || t('terminology.gram_panchayat.houseNumber'),
      ward: t(`terminology.${type}.ward`, { defaultValue: '' }) || t('terminology.gram_panchayat.ward'),
      wardPlural: t(`terminology.${type}.wardPlural`, { defaultValue: '' }) || t('terminology.gram_panchayat.wardPlural'),
      collector: t(`terminology.${type}.collector`, { defaultValue: '' }) || t('terminology.gram_panchayat.collector'),
      collectorPlural: t(`terminology.${type}.collectorPlural`, { defaultValue: '' }) || t('terminology.gram_panchayat.collectorPlural'),
      familySize: t(`terminology.${type}.familySize`, { defaultValue: '' }) || t('terminology.gram_panchayat.familySize'),
      address: t(`terminology.${type}.address`, { defaultValue: '' }) || t('terminology.gram_panchayat.address'),
      session: t(`terminology.${type}.session`, { defaultValue: '' }) || t('terminology.gram_panchayat.session'),
      sessionPlural: t(`terminology.${type}.sessionPlural`, { defaultValue: '' }) || t('terminology.gram_panchayat.sessionPlural'),
    };

    /**
     * Smart translation function.
     * Tries `key.{unitType}` first (type-specific nested key).
     * Falls back to base `key` if no type-specific version exists.
     * 
     * Example:
     *   tt('manager.totalHouseholds')
     *   → tries t('manager.totalHouseholds.apartment') first
     *   → falls back to t('manager.totalHouseholds')
     */
    const tt = (key: string, options?: Record<string, unknown>): string => {
      const typeSpecific = t(`${key}.${type}`, { ...options, defaultValue: '' });
      if (typeSpecific) return typeSpecific;
      return t(key, options as any);
    };

    return { tt, label, unitType: type };
  }, [type, lang, t]);
}
