import { TourStep } from '@/hooks/useDashboardTour';

export const getManagerTourSteps = (t: any): TourStep[] => [
  {
    target: '.manager-overview-tab',
    title: t('tour.manager.overviewTitle', 'Village Overview'),
    content: t('tour.manager.overviewContent', 'Your command center! View village statistics, manage wards, and get a quick overview of all operations.'),
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '.manager-collectors-tab',
    title: t('tour.manager.collectorsTitle', 'Manage Collectors'),
    content: t('tour.manager.collectorsContent', 'Add new collectors, view their performance metrics, and manage feedback from households.'),
    placement: 'top',
  },
  {
    target: '.manager-households-tab',
    title: t('tour.manager.householdsTitle', 'Household Management'),
    content: t('tour.manager.householdsContent', 'Register new households, bulk upload via Excel, generate QR codes, and manage household information.'),
    placement: 'top',
  },
  {
    target: '.manager-collections-tab',
    title: t('tour.manager.collectionsTitle', 'Collection Oversight'),
    content: t('tour.manager.collectionsContent', 'Monitor all waste collections, view detailed records with photos and ratings, and track household compliance.'),
    placement: 'top',
  },
  {
    target: '.manager-issues-tab',
    title: t('tour.manager.issuesTitle', 'Issue Resolution'),
    content: t('tour.manager.issuesContent', 'Review reported issues from collectors and households, provide responses, and update resolution status.'),
    placement: 'top',
  },
  {
    target: '.manager-reports-tab',
    title: t('tour.manager.reportsTitle', 'Analytics & Reports'),
    content: t('tour.manager.reportsContent', 'Access detailed analytics, collection trends, performance metrics, and generate reports for better decision making.'),
    placement: 'top',
  },
  {
    target: '.manager-announcements-tab',
    title: t('tour.manager.announcementsTitle', 'Communication Hub'),
    content: t('tour.manager.announcementsContent', 'Send announcements to collectors and households, share important updates with photo attachments.'),
    placement: 'top',
  },
];