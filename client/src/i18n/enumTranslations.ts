import i18n from './index';

/**
 * Maps raw database enum values to i18n translation keys.
 * Usage: translateEnum('collectionStatus', 'collected') → "हो गया" (in Hindi)
 * Falls back to raw value if no mapping found.
 */

const ENUM_MAPS: Record<string, Record<string, string>> = {
  collectionStatus: {
    collected: 'enums.status.collected',
    not_collected: 'enums.status.notCollected',
    partially_collected: 'enums.status.partiallyCollected',
    pending: 'enums.status.pending',
  },
  issueStatus: {
    open: 'issues.open',
    in_progress: 'issues.inProgress',
    resolved: 'issues.resolved',
  },
  issueCategory: {
    'Illegal Dumping': 'enums.issueCategories.illegalDumping',
    'Collection Delay': 'enums.issueCategories.collectionDelay',
    'Missed Pickup': 'enums.issueCategories.missedPickup',
    'Road Cleanliness': 'enums.issueCategories.roadCleanliness',
    'Plastic Usage': 'enums.issueCategories.plasticUsage',
    'Collector Behavior': 'enums.issueCategories.collectorBehavior',
    'Infrastructure': 'enums.issueCategories.infrastructure',
    'Other': 'enums.notCollectedReasons.other',
  },
  notCollectedReason: {
    'Waste Not segregated': 'enums.notCollectedReasons.wasteNotSegregated',
    'House locked': 'enums.notCollectedReasons.houseLocked',
    'No one home': 'enums.notCollectedReasons.noOneHome',
    'No waste to collect': 'enums.notCollectedReasons.noWaste',
    'House not accessible': 'enums.notCollectedReasons.notAccessible',
    'Resident refused': 'enums.notCollectedReasons.residentRefused',
    'Other': 'enums.notCollectedReasons.other',
  },
  attendanceStatus: {
    present: 'enums.attendance.present',
    absent: 'enums.attendance.absent',
    half_day: 'enums.attendance.halfDay',
  },
};

export function translateEnum(type: string, value: string): string {
  if (!value) return '';
  const key = ENUM_MAPS[type]?.[value];
  return key ? i18n.t(key) : value;
}
