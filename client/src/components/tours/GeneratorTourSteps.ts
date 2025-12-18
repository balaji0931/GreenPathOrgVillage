import { TourStep } from '@/hooks/useDashboardTour';

export const getGeneratorTourSteps = (t: any): TourStep[] => [
  {
    target: '.generator-home-tab',
    title: t('tour.generator.homeTitle', 'Welcome Home'),
    content: t('tour.generator.homeContent', 'Your main dashboard shows collection history, upcoming schedules, and important announcements from village management.'),
    placement: 'bottom',
    disableBeacon: true,
  },
   {
    target: '.generator-collection-stats',
    title: t('tour.generator.statsTitle', 'Your Performance'),
    content: t('tour.generator.statsContent', 'See your household\'s waste segregation ratings and collection statistics over time.'),
    placement: 'bottom',
  },
  {
    target: '.generator-collections-tab',
    title: t('tour.generator.collectionsTitle', 'Collection History'),
    content: t('tour.generator.collectionsContent', 'View your household\'s waste collection history, ratings, and provide feedback on collector performance.'),
    placement: 'bottom',
  },
   {
    target: '.generator-qr-tab',
    title: t('tour.generator.qrTitle', 'Your QR Code'),
    content: t('tour.generator.qrContent', 'Display your household QR code for collectors to scan during waste collection visits.'),
    placement: 'bottom',
  },
  {
    target: '.generator-issues-tab',
    title: t('tour.generator.issuesTitle', 'Report Problems'),
    content: t('tour.generator.issuesContent', 'Report village issues like missed collections, illegal dumping, or infrastructure problems with photo evidence.'),
    placement: 'bottom',
  },
  {
    target: '.generator-profile-tab',
    title: t('tour.generator.profileTitle', 'Account Settings'),
    content: t('tour.generator.profileContent', 'Manage your account, change password, and access household settings from your profile.'),
    placement: 'bottom',
  },
];