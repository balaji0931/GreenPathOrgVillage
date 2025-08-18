import { TourStep } from '@/hooks/useDashboardTour';

export const getCollectorTourSteps = (t: any): TourStep[] => [
  {
    target: '.collector-home-tab',
    title: t('tour.collector.homeTitle', 'Welcome to Home'),
    content: t('tour.collector.homeContent', 'This is your main dashboard where you can see daily statistics, completed collections, and important announcements from your manager.'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.collector-scan-tab', 
    title: t('tour.collector.scanTitle', 'QR Scanner'),
    content: t('tour.collector.scanContent', 'Tap here to open the QR code scanner. Scan household QR codes to start recording waste collections quickly and easily.'),
    placement: 'bottom',
  },
  {
    target: '.collector-announcements-tab',
    title: t('tour.collector.announcementsTitle', 'Important Updates'),
    content: t('tour.collector.announcementsContent', 'Stay informed with announcements from your manager. Check here for schedule changes, new policies, or important village news.'),
    placement: 'bottom',
  },
  {
    target: '.collector-issues-tab',
    title: t('tour.collector.issuesTitle', 'Report Issues'),
    content: t('tour.collector.issuesContent', 'Found a problem in the village? Report issues like illegal dumping, road cleanliness problems, or other concerns with photos.'),
    placement: 'bottom',
  },
  {
    target: '.collector-profile-tab',
    title: t('tour.collector.profileTitle', 'Your Profile'),
    content: t('tour.collector.profileContent', 'Access your account settings, change your password, and manage your profile information from here.'),
    placement: 'bottom',
  },
    {
    target: '.collector-daily-stats',
    title: t('tour.collector.statsTitle', 'Daily Progress'),
    content: t('tour.collector.statsContent', 'Track your daily collection progress here. See how many households you\'ve completed and how many are still pending.'),
    placement: 'bottom',
  },
  {
    target: '.collector-recent-collections',
    title: t('tour.collector.recentTitle', 'Recent Collections'),
    content: t('tour.collector.recentContent', 'View your recent collection activities with status indicators. Green means collected, red means missed with reasons.'),
    placement: 'bottom',
  },
];