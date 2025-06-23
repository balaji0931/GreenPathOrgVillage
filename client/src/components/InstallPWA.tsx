import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Wifi, WifiOff, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useTranslation } from 'react-i18next';

interface InstallPWAProps {
  showInline?: boolean;
  onInstallComplete?: () => void;
}

export function InstallPWA({ showInline = false, onInstallComplete }: InstallPWAProps) {
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { t } = useTranslation();

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installApp();
    setIsInstalling(false);
    
    if (success) {
      console.log('App installed successfully');
      onInstallComplete?.();
    }
  };

  if (isInstalled || isHidden) {
    return null; // Don't show install prompt if already installed or hidden
  }

  // Inline version for login page
  if (showInline) {
    // Always show the install button for testing, even if not installable yet
    return (
      <Button
        onClick={handleInstall}
        disabled={isInstalling || !isInstallable}
        variant="outline"
        className="w-full border-green-200 text-green-700 hover:bg-green-50"
      >
        <Download className="h-4 w-4 mr-2" />
        {isInstalling ? t('app.installing') : t('app.installApp')}
        {!isInstallable && (
          <span className="ml-2 text-xs opacity-60">
            ({isOnline ? 'Preparing...' : 'Offline'})
          </span>
        )}
      </Button>
    );
  }

  return (
    <>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">You're offline - Some features may be limited</span>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40">
          <Card className="shadow-lg border-green-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  {t('app.installApp')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHidden(true)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {t('app.installDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isInstalling ? t('app.installing') : t('app.install')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHidden(true)}
                >
                  {t('app.later')}
                </Button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 mb-1">
                  <Wifi className="h-3 w-3" />
                  {t('app.worksOffline')}
                </div>
                <div>{t('app.fastLoading')}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}