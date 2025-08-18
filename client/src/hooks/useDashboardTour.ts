import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export interface TourStep {
  target: string;
  content: string;
  title: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  disableBeacon?: boolean;
}

export const useDashboardTour = () => {
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const { t } = useTranslation();

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRunTour(true);
    setShowWelcomeModal(false);
  }, []);

  const skipTour = useCallback(() => {
    setRunTour(false);
    setShowWelcomeModal(false);
    setStepIndex(0);
  }, []);

  const showWelcome = useCallback(() => {
    setShowWelcomeModal(true);
  }, []);

  const resetTour = useCallback(() => {
    setRunTour(false);
    setStepIndex(0);
  }, []);

  // Tour styles configuration
  const tourStyles = {
    options: {
      primaryColor: '#16a34a', // green-600
      width: 320,
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 12,
      padding: '16px 20px',
      fontSize: 14,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      backgroundColor: '#ffffff',
      color: '#374151',
    },
    tooltipTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: '#111827',
      marginBottom: 8,
    },
    tooltipContent: {
      lineHeight: 1.5,
      marginBottom: 16,
    },
    buttonNext: {
      backgroundColor: '#16a34a',
      color: '#ffffff',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 14,
      fontWeight: 500,
      border: 'none',
      cursor: 'pointer',
    },
    buttonBack: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 14,
      fontWeight: 500,
      border: 'none',
      cursor: 'pointer',
      marginRight: 8,
    },
    buttonSkip: {
      backgroundColor: 'transparent',
      color: '#6b7280',
      border: 'none',
      cursor: 'pointer',
      fontSize: 14,
      textDecoration: 'underline',
    },
    buttonClose: {
      backgroundColor: '#ef4444',
      color: '#ffffff',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 14,
      fontWeight: 500,
      border: 'none',
      cursor: 'pointer',
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    spotlight: {
      borderRadius: 8,
    },
  };

  return {
    runTour,
    stepIndex,
    showWelcomeModal,
    startTour,
    skipTour,
    showWelcome,
    resetTour,
    setStepIndex,
    tourStyles,
    t,
  };
};