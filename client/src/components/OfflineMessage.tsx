
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

const WASTE_MANAGEMENT_QUOTES = [
  {
    quote: "The Earth does not belong to us; we belong to the Earth. All things are connected like the blood that unites one family.",
    author: "Chief Seattle"
  },
  {
    quote: "We do not inherit the Earth from our ancestors; we borrow it from our children.",
    author: "Native American Proverb"
  },
  {
    quote: "Waste not, want not.",
    author: "Traditional Proverb"
  },
  {
    quote: "The greatest threat to our planet is the belief that someone else will save it.",
    author: "Robert Swan"
  },
  {
    quote: "There is no such thing as 'away'. When we throw anything away, it must go somewhere.",
    author: "Annie Leonard"
  },
  {
    quote: "Every bit of waste matters. Every action counts. Every person makes a difference.",
    author: "Environmental Wisdom"
  },
  {
    quote: "Be the change you wish to see in the world - start with managing waste responsibly.",
    author: "Inspired by Mahatma Gandhi"
  },
  {
    quote: "A clean environment is everyone's responsibility. Together we can make a difference.",
    author: "GreenPath Motto"
  },
  {
    quote: "Reduce, Reuse, Recycle - the three R's for a sustainable future.",
    author: "Environmental Principle"
  },
  {
    quote: "Small acts, when multiplied by millions of people, can transform the world.",
    author: "Howard Zinn"
  }
];

interface OfflineMessageProps {
  userRole?: string;
  userName?: string;
}

export function OfflineMessage({ userRole, userName }: OfflineMessageProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Rotate quotes every 10 seconds
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % WASTE_MANAGEMENT_QUOTES.length);
    }, 10000);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentQuote = WASTE_MANAGEMENT_QUOTES[currentQuoteIndex];

  const handleRefresh = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Offline Status */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <WifiOff className="w-12 h-12 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-orange-800 mb-2">
              You're Offline
            </h2>
            <p className="text-orange-700 text-sm">
              {userRole && userName ? (
                <>Welcome back, {userName}! Your data is safe and will sync when you're back online.</>
              ) : (
                "Connect to the internet to access all features."
              )}
            </p>
          </CardContent>
        </Card>

        {/* Inspirational Quote */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <blockquote className="text-lg font-medium text-green-800 mb-4 italic leading-relaxed">
              "{currentQuote.quote}"
            </blockquote>
            <cite className="text-green-600 font-semibold">
              — {currentQuote.author}
            </cite>
            <div className="flex justify-center mt-4">
              {WASTE_MANAGEMENT_QUOTES.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                    index === currentQuoteIndex ? 'bg-green-600' : 'bg-green-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* GreenPath Info */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-3">♻️</div>
            <h3 className="text-lg font-bold text-blue-800 mb-2">
              GreenPath Org
            </h3>
            <p className="text-blue-700 text-sm mb-4">
              Building sustainable communities through responsible waste management. 
              Every collection makes a difference!
            </p>
            {userRole === 'collector' && (
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-blue-800 font-medium text-sm">
                  💪 Your offline collections are saved and will sync automatically!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={!isOnline}
          className={`w-full py-4 text-lg font-semibold transition-all ${
            isOnline 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5" />
                <RefreshCw className="w-5 h-5" />
                <span>Refresh App</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5" />
                <span>Waiting for Connection...</span>
              </>
            )}
          </div>
        </Button>

        {/* Connection Status */}
        <div className={`text-center text-sm font-medium ${
          isOnline ? 'text-green-600' : 'text-orange-600'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            {isOnline ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Back online! You can refresh now.</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Still offline. Checking connection...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
