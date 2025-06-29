import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Home, 
  Scan, 
  User, 
  Camera, 
  Star, 
  Check, 
  X, 
  ArrowLeft,
  Mic,
  Send
} from 'lucide-react';

// Mobile Demo Component
const MobileDemo: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'scanner' | 'form' | 'profile'>('dashboard');
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'profile'>('home');
  const [rating, setRating] = useState(0);
  const [isSegregated, setIsSegregated] = useState<boolean | null>(null);
  const [isRecycled, setIsRecycled] = useState<boolean | null>(null);
  const [hasCompost, setHasCompost] = useState<boolean | null>(null);
  const [scannedHousehold, setScannedHousehold] = useState<any>(null);

  // Mock data for demo
  const mockStats = {
    collectionsToday: 12,
    avgRating: 4.2,
    totalCollections: 156
  };

  const mockCollections = [
    { id: 1, householdName: 'Rajesh Kumar', time: '10:30 AM', rating: 5, photo: true, voice: true },
    { id: 2, householdName: 'Priya Sharma', time: '11:15 AM', rating: 4, photo: true, voice: false },
    { id: 3, householdName: 'Mohammad Ali', time: '12:00 PM', rating: 5, photo: false, voice: true },
  ];

  const mockHousehold = {
    id: 'HH001',
    headName: 'Rajesh Kumar',
    houseNumber: 'A-123',
    village: 'Green Village'
  };

  // Mobile frame wrapper
  const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mx-auto max-w-sm">
      <div className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
        <div className="bg-black rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-black text-white text-xs px-6 py-2 flex justify-between items-center">
            <span>9:41</span>
            <div className="flex space-x-1">
              <div className="w-4 h-2 bg-white rounded-sm"></div>
              <div className="w-6 h-2 bg-white rounded-sm"></div>
              <div className="w-6 h-2 bg-green-500 rounded-sm"></div>
            </div>
          </div>
          
          {/* App content */}
          <div className="bg-gray-50 h-[600px] relative">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard Screen
  const DashboardScreen = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Welcome, Collector! 👋</h1>
            <p className="text-green-100 text-sm">{format(new Date(), 'EEEE, MMM dd')}</p>
          </div>
          <div className="text-right">
            <span className="bg-green-500 px-2 py-1 rounded text-xs">Online</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto pb-20">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Today's Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-lg shadow text-center">
                  <div className="text-2xl font-bold text-green-600">{mockStats.collectionsToday}</div>
                  <div className="text-xs text-gray-600">Collections Today</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow text-center">
                  <div className="text-2xl font-bold text-green-600">{mockStats.avgRating}</div>
                  <div className="text-xs text-gray-600">Avg Rating</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('scan')}
                  className="bg-green-600 text-white p-4 rounded-lg flex flex-col items-center space-y-2"
                >
                  <span className="text-2xl">📱</span>
                  <span className="text-sm font-medium">Scan QR</span>
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="bg-blue-600 text-white p-4 rounded-lg flex flex-col items-center space-y-2"
                >
                  <span className="text-2xl">👤</span>
                  <span className="text-sm font-medium">Profile</span>
                </button>
              </div>
            </div>

            {/* Recent Collections */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Recent Collections</h2>
              <div className="space-y-2">
                {mockCollections.map((collection) => (
                  <div key={collection.id} className="bg-white p-3 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">{collection.householdName}</span>
                      <span className="text-xs text-gray-500">{collection.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">{'⭐'.repeat(collection.rating)}</span>
                      </div>
                      <div className="flex space-x-1">
                        {collection.photo && <span className="text-xs">📷</span>}
                        {collection.voice && <span className="text-xs">🎤</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Scan QR Code</h2>
              <p className="text-gray-600 text-sm">Point camera at QR code</p>
            </div>
            
            <div className="relative">
              <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Camera viewfinder</p>
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-green-500 rounded-lg"></div>
            </div>

            <button 
              onClick={() => {
                setScannedHousehold(mockHousehold);
                setCurrentScreen('form');
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              🎯 Simulate QR Scan
            </button>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-green-600 text-white p-4 rounded-lg text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-xl font-bold">C</span>
              </div>
              <h2 className="font-bold">Collector Name</h2>
              <p className="text-green-100 text-sm">collector@example.com</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Personal Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Village:</span>
                  <span>Green Village</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Offline Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Collections:</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Files:</span>
                  <span>0</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Language</h3>
              <div className="flex space-x-2">
                <button className="flex-1 py-2 px-3 bg-green-600 text-white rounded text-sm">English</button>
                <button className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 rounded text-sm">हिंदी</button>
              </div>
            </div>

            <button className="w-full bg-red-600 text-white py-3 rounded-lg font-medium">
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-3 px-2 text-center ${activeTab === 'home' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <Home className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 px-2 text-center ${activeTab === 'scan' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <Scan className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">Scan</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-2 text-center ${activeTab === 'profile' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <User className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Collection Form Screen
  const CollectionFormScreen = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 flex items-center">
        <button onClick={() => setCurrentScreen('dashboard')} className="mr-3">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold">Collection Form</h1>
          <p className="text-green-100 text-sm">{scannedHousehold?.headName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto pb-20">
        <div className="space-y-6">
          {/* Household Info */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">{scannedHousehold?.headName}</h2>
            <p className="text-gray-600">House #{scannedHousehold?.houseNumber}</p>
            <p className="text-xs text-gray-500">{format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
          </div>

          {/* Rating */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-center">Rate Segregation Quality</h3>
            <div className="flex justify-center space-x-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`w-12 h-16 rounded-lg flex flex-col items-center justify-center ${
                    rating === star ? 'bg-green-600 text-white' : 'bg-gray-100'
                  }`}
                >
                  <span className="text-xl mb-1">
                    {star <= 2 ? '😞' : star <= 3 ? '😐' : '😊'}
                  </span>
                  <span className="text-xs font-bold">{star}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-green-600">
              {rating <= 2 ? 'Needs Improvement 😞' : rating <= 3 ? 'Good! 😐' : rating >= 4 ? 'Excellent! 😊' : 'Please rate'}
            </p>
          </div>

          {/* Yes/No Questions */}
          <div className="space-y-4">
            {/* Segregated */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">♻️ Is Segregated?</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsSegregated(true)}
                  className={`flex-1 py-3 rounded-lg flex flex-col items-center ${
                    isSegregated === true ? 'bg-green-100 border-2 border-green-600' : 'bg-green-50'
                  }`}
                >
                  <span className="text-xl mb-1">✅</span>
                  <span className="text-sm font-medium">Yes</span>
                </button>
                <button
                  onClick={() => setIsSegregated(false)}
                  className={`flex-1 py-3 rounded-lg flex flex-col items-center ${
                    isSegregated === false ? 'bg-red-100 border-2 border-red-600' : 'bg-red-50'
                  }`}
                >
                  <span className="text-xl mb-1">❌</span>
                  <span className="text-sm font-medium">No</span>
                </button>
              </div>
            </div>

            {/* Recyclable */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">🔄 Can this be recycled?</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsRecycled(true)}
                  className={`flex-1 py-3 rounded-lg flex flex-col items-center ${
                    isRecycled === true ? 'bg-green-100 border-2 border-green-600' : 'bg-green-50'
                  }`}
                >
                  <span className="text-xl mb-1">✅</span>
                  <span className="text-sm font-medium">Yes</span>
                </button>
                <button
                  onClick={() => setIsRecycled(false)}
                  className={`flex-1 py-3 rounded-lg flex flex-col items-center ${
                    isRecycled === false ? 'bg-red-100 border-2 border-red-600' : 'bg-red-50'
                  }`}
                >
                  <span className="text-xl mb-1">❌</span>
                  <span className="text-sm font-medium">No</span>
                </button>
              </div>
            </div>

            {/* Compost */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">🌱 Can this be composted?</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setHasCompost(true)}
                  className={`flex-1 py-3 rounded-lg flex flex-col items-center ${
                    hasCompost === true ? 'bg-green-100 border-2 border-green-600' : 'bg-green-50'
                  }`}
                >
                  <span className="text-xl mb-1">✅</span>
                  <span className="text-sm font-medium">Yes</span>
                </button>
                <button
                  onClick={() => setHasCompost(false)}
                  className={`flex-1 py-3 rounded-lg flex flex-col items-center ${
                    hasCompost === false ? 'bg-red-100 border-2 border-red-600' : 'bg-red-50'
                  }`}
                >
                  <span className="text-xl mb-1">❌</span>
                  <span className="text-sm font-medium">No</span>
                </button>
              </div>
            </div>
          </div>

          {/* Media Capture */}
          <div className="space-y-3">
            <button className="w-full bg-blue-100 border-2 border-dashed border-blue-300 py-4 rounded-lg flex flex-col items-center">
              <span className="text-3xl mb-2">📸</span>
              <span className="text-sm font-medium">Take Photo</span>
            </button>
            
            <button className="w-full bg-purple-100 border-2 border-dashed border-purple-300 py-4 rounded-lg flex flex-col items-center">
              <span className="text-3xl mb-2">🎤</span>
              <span className="text-sm font-medium">Record Voice</span>
            </button>
          </div>

          {/* Submit Button */}
          <button 
            onClick={() => {
              alert('Collection submitted successfully! 🎉');
              setCurrentScreen('dashboard');
              setRating(0);
              setIsSegregated(null);
              setIsRecycled(null);
              setHasCompost(null);
            }}
            disabled={!rating || isSegregated === null || isRecycled === null || hasCompost === null}
            className={`w-full py-4 rounded-lg font-bold text-lg ${
              rating && isSegregated !== null && isRecycled !== null && hasCompost !== null
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            ✅ Submit Collection
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            GreenPathOrg Mobile App Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Interactive demo of the React Native mobile app for waste collectors. 
            Experience the mobile-first interface, QR scanning simulation, and touch-optimized forms.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Mobile Demo */}
          <div className="lg:sticky lg:top-4">
            <MobileFrame>
              <AnimatePresence mode="wait">
                {currentScreen === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <DashboardScreen />
                  </motion.div>
                )}
                {currentScreen === 'form' && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <CollectionFormScreen />
                  </motion.div>
                )}
              </AnimatePresence>
            </MobileFrame>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                🚀 Key Mobile Features
              </h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Mobile-first collector dashboard with 3-tab navigation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Real QR code scanning with household validation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Touch-optimized forms with emoji ratings</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Photo capture and voice recording</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Offline data storage and sync</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Multi-language support (English/Hindi)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📱 How to Test
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-green-600 mb-2">1. Dashboard Navigation</h3>
                  <p className="text-sm text-gray-600">
                    Use the bottom tabs (Home, Scan, Profile) to navigate between sections.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-green-600 mb-2">2. QR Code Simulation</h3>
                  <p className="text-sm text-gray-600">
                    Go to Scan tab and click "Simulate QR Scan" to experience the collection flow.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-green-600 mb-2">3. Collection Form</h3>
                  <p className="text-sm text-gray-600">
                    Fill out the mobile-optimized form with emoji ratings and yes/no buttons.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-green-600 mb-2">4. Profile Settings</h3>
                  <p className="text-sm text-gray-600">
                    View user information, offline data status, and language settings.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-2">Ready for Production</h2>
              <p className="text-green-100 mb-4">
                This React Native app is fully built and ready to be compiled for Android devices. 
                It includes all features from your web application with mobile optimizations.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">React Native 0.73</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">TypeScript</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Same Database</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Offline Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDemo;