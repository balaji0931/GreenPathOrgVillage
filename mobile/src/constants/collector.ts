/**
 * Collector Constants for GreenPath Mobile
 *
 * Matches the web collector-dashboard.tsx values exactly.
 * Do not change wording or order.
 */

export const NOT_COLLECTED_REASONS = [
  'Waste Not segregated',
  'House locked',
  'No one home',
  'No waste to collect',
  'House not accessible',
  'Resident refused',
  'Other',
] as const;

export const ISSUE_CATEGORIES = [
  'Illegal Dumping',
  'Collection Delay',
  'Missed Pickup',
  'Road Cleanliness',
  'Plastic Usage',
  'Collector Behavior',
  'Infrastructure',
  'Other',
] as const;

export const WASTE_TYPES = [
  { key: 'wet', label: 'Wet' },
  { key: 'dry', label: 'Dry' },
  { key: 'sanitary', label: 'Sanitary' },
  { key: 'special_care', label: 'Special Care' },
  { key: 'mixed', label: 'Mixed' },
] as const;

export const COLLECTION_STATUSES = {
  collected: 'collected',
  missed: 'missed',
} as const;

export const ISSUE_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
] as const;
