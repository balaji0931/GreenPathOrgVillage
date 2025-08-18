import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Play, X } from 'lucide-react';

interface WelcomeTourModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkipTour: () => void;
  userRole: string;
}

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({
  isOpen,
  onStartTour,
  onSkipTour,
  userRole,
}) => {
  const { t } = useTranslation();

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'collector':
        return t('tour.welcome.collector', 'Collector');
      case 'generator':
        return t('tour.welcome.generator', 'Generator');
      case 'manager':
        return t('tour.welcome.manager', 'Manager');
      default:
        return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onSkipTour}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {t('tour.welcome.title', 'Welcome to Your Dashboard!')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {t('tour.welcome.subtitle', 'Hello {{role}}! Ready to explore your dashboard?', {
                role: getRoleDisplayName(userRole),
              })}
            </p>
            <p className="text-sm text-gray-500">
              {t('tour.welcome.description', 'Would you like a quick guided tour to learn about all the features available to you?')}
            </p>
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <Button
              onClick={onStartTour}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-base font-semibold text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              {t('tour.welcome.startTour', 'Start Tour')}
            </Button>
            
            <Button
              onClick={onSkipTour}
              variant="outline"
              className="w-full h-12 border-2 text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="w-5 h-5 mr-2" />
              {t('tour.welcome.skipTour', 'Skip for Now')}
            </Button>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              {t('tour.welcome.replayHint', 'You can always start the tour later from the help button in the top navigation.')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};