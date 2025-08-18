import React, { useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, CallBackProps } from 'react-joyride';
import { useDashboardTour, TourStep } from '@/hooks/useDashboardTour';
import { WelcomeTourModal } from './WelcomeTourModal';
import { getCollectorTourSteps } from './CollectorTourSteps';
import { getGeneratorTourSteps } from './GeneratorTourSteps';
import { getManagerTourSteps } from './ManagerTourSteps';

interface DashboardTourProps {
  userRole: string;
  shouldShowWelcome?: boolean;
}

export const DashboardTour: React.FC<DashboardTourProps> = ({
  userRole,
  shouldShowWelcome = false,
}) => {
  const {
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
  } = useDashboardTour();

  // Show welcome modal on login if needed
  useEffect(() => {
    if (shouldShowWelcome) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        showWelcome();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowWelcome, showWelcome]);

  // Get tour steps based on user role
  const getTourSteps = (): TourStep[] => {
    switch (userRole) {
      case 'collector':
        return getCollectorTourSteps(t);
      case 'generator':
        return getGeneratorTourSteps(t);
      case 'manager':
        return getManagerTourSteps(t);
      default:
        return [];
    }
  };

  const tourSteps = getTourSteps();

  // Handle tour callback events
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // Update step index
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Tour finished or skipped
      resetTour();
    }
  };

  // Expose tour controls globally for the tour button
  useEffect(() => {
    (window as any).startDashboardTour = startTour;
  }, [startTour]);

  return (
    <>
      {/* Welcome Modal */}
      <WelcomeTourModal
        isOpen={showWelcomeModal}
        onStartTour={startTour}
        onSkipTour={skipTour}
        userRole={userRole}
      />

      {/* Joyride Tour */}
      <Joyride
        callback={handleJoyrideCallback}
        continuous={true}
        hideCloseButton={false}
        run={runTour}
        scrollToFirstStep={true}
        showProgress={true}
        showSkipButton={true}
        stepIndex={stepIndex}
        steps={tourSteps}
        styles={{
          options: tourStyles.options,
          tooltip: tourStyles.tooltip,
          tooltipTitle: tourStyles.tooltipTitle,
          tooltipContent: tourStyles.tooltipContent,
          buttonNext: tourStyles.buttonNext,
          buttonBack: tourStyles.buttonBack,
          buttonSkip: tourStyles.buttonSkip,
          buttonClose: tourStyles.buttonClose,
          overlay: tourStyles.overlay,
          spotlight: tourStyles.spotlight,
        }}
        locale={{
          back: t('tour.navigation.back', 'Back'),
          close: t('tour.navigation.close', 'Close'),
          last: t('tour.navigation.finish', 'Finish'),
          next: t('tour.navigation.next', 'Next'),
          skip: t('tour.navigation.skip', 'Skip'),
        }}
      />
    </>
  );
};