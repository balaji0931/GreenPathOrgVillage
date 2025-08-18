import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TourButtonProps {
  onClick?: () => void;
  className?: string;
}

export const TourButton: React.FC<TourButtonProps> = ({ onClick, className = "" }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if ((window as any).startDashboardTour) {
      (window as any).startDashboardTour();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      className={`tour-button flex items-center justify-center p-2 h-9 w-9 rounded-full hover:bg-white/20 ${className}`}
      title={t('tour.button.tooltip', 'Take a Tour')}
    >
      <HelpCircle className="h-5 w-5" strokeWidth={3}/>
    </Button>
  );
};