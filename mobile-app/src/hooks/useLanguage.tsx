import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language translations - same as web app
const translations = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      close: 'Close',
      submit: 'Submit',
      refresh: 'Refresh',
    },
    auth: {
      login: 'Login',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      loginButton: 'Sign In',
      invalidCredentials: 'Invalid email or password',
      loginError: 'Login failed. Please try again.',
      welcome: 'Welcome to GreenPathOrg',
      subtitle: 'Waste Management System',
    },
    dashboard: {
      overview: 'Overview',
      villages: 'Villages',
      households: 'Households',
      collectors: 'Collectors',
      collections: 'Collections',
      issues: 'Issues',
      reports: 'Reports',
      announcements: 'Announcements',
      profile: 'Profile',
      stats: 'Statistics',
      totalVillages: 'Total Villages',
      totalHouseholds: 'Total Households',
      totalCollectors: 'Total Collectors',
      collectionsToday: 'Collections Today',
      openIssues: 'Open Issues',
      avgRating: 'Average Rating',
    },
    collection: {
      scanQR: 'Scan QR Code',
      household: 'Household',
      segregation: 'Segregation',
      segregationRating: 'Segregation Rating',
      isSegregated: 'Is Segregated?',
      isRecycled: 'Is Recycled?',
      hasCompost: 'Has Compost?',
      feedback: 'Feedback',
      takePhoto: 'Take Photo',
      recordVoice: 'Record Voice',
      submitCollection: 'Submit Collection',
      collectionSubmitted: 'Collection submitted successfully',
      alreadyCollected: 'Already collected today',
      scanInstruction: 'Point camera at QR code',
      excellent: 'Excellent! 😊',
      good: 'Good! 😐',
      needsImprovement: 'Needs Improvement 😞',
      rateSegregation: 'Rate Segregation Quality',
      recycleQuestion: 'Can this be recycled?',
      compostQuestion: 'Can this be composted?',
      additionalNotes: 'Additional Notes',
      confirmSubmission: 'Confirm Collection Submission',
    },
    issues: {
      reportIssue: 'Report Issue',
      title: 'Issue Title',
      description: 'Description',
      priority: 'Priority',
      status: 'Status',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      open: 'Open',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      submitIssue: 'Submit Issue',
      issueReported: 'Issue reported successfully',
      attachPhoto: 'Attach Photo',
      issueDetails: 'Issue Details',
      managerReply: 'Manager Reply',
    },
    profile: {
      personalInfo: 'Personal Information',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      village: 'Village',
      language: 'Language',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
    },
  },
  hi: {
    common: {
      save: 'सहेजें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      add: 'जोड़ें',
      search: 'खोजें',
      filter: 'फिल्टर',
      loading: 'लोड हो रहा है...',
      error: 'त्रुटि',
      success: 'सफलता',
      warning: 'चेतावनी',
      info: 'जानकारी',
      confirm: 'पुष्टि करें',
      yes: 'हाँ',
      no: 'नहीं',
      ok: 'ठीक है',
      back: 'वापस',
      next: 'अगला',
      done: 'हो गया',
      close: 'बंद करें',
      submit: 'जमा करें',
      refresh: 'रीफ्रेश',
    },
    auth: {
      login: 'लॉगिन',
      logout: 'लॉगआउट',
      email: 'ईमेल',
      password: 'पासवर्ड',
      forgotPassword: 'पासवर्ड भूल गए?',
      loginButton: 'साइन इन',
      invalidCredentials: 'गलत ईमेल या पासवर्ड',
      loginError: 'लॉगिन विफल। कृपया पुनः प्रयास करें।',
      welcome: 'GreenPathOrg में आपका स्वागत है',
      subtitle: 'अपशिष्ट प्रबंधन प्रणाली',
    },
    dashboard: {
      overview: 'अवलोकन',
      villages: 'गांव',
      households: 'घर',
      collectors: 'संग्रहकर्ता',
      collections: 'संग्रह',
      issues: 'समस्याएं',
      reports: 'रिपोर्ट',
      announcements: 'घोषणाएं',
      profile: 'प्रोफाइल',
      stats: 'आंकड़े',
      totalVillages: 'कुल गांव',
      totalHouseholds: 'कुल घर',
      totalCollectors: 'कुल संग्रहकर्ता',
      collectionsToday: 'आज के संग्रह',
      openIssues: 'खुली समस्याएं',
      avgRating: 'औसत रेटिंग',
    },
    collection: {
      scanQR: 'QR कोड स्कैन करें',
      household: 'घर',
      segregation: 'अलगाव',
      segregationRating: 'अलगाव रेटिंग',
      isSegregated: 'अलग किया गया है?',
      isRecycled: 'पुनर्चक्रित किया गया है?',
      hasCompost: 'खाद है?',
      feedback: 'प्रतिक्रिया',
      takePhoto: 'फोटो लें',
      recordVoice: 'आवाज रिकॉर्ड करें',
      submitCollection: 'संग्रह जमा करें',
      collectionSubmitted: 'संग्रह सफलतापूर्वक जमा किया गया',
      alreadyCollected: 'आज पहले से ही एकत्र किया गया',
      scanInstruction: 'QR कोड पर कैमरा पॉइंट करें',
      excellent: 'उत्कृष्ट! 😊',
      good: 'अच्छा! 😐',
      needsImprovement: 'सुधार की आवश्यकता 😞',
      rateSegregation: 'अलगाव गुणवत्ता रेट करें',
      recycleQuestion: 'क्या इसे पुनर्चक्रित किया जा सकता है?',
      compostQuestion: 'क्या इसे खाद बनाया जा सकता है?',
      additionalNotes: 'अतिरिक्त नोट्स',
      confirmSubmission: 'संग्रह जमा करने की पुष्टि करें',
    },
    issues: {
      reportIssue: 'समस्या रिपोर्ट करें',
      title: 'समस्या शीर्षक',
      description: 'विवरण',
      priority: 'प्राथमिकता',
      status: 'स्थिति',
      low: 'कम',
      medium: 'मध्यम',
      high: 'उच्च',
      open: 'खुला',
      inProgress: 'प्रगति में',
      resolved: 'हल हो गया',
      submitIssue: 'समस्या जमा करें',
      issueReported: 'समस्या सफलतापूर्वक रिपोर्ट की गई',
      attachPhoto: 'फोटो संलग्न करें',
      issueDetails: 'समस्या विवरण',
      managerReply: 'प्रबंधक उत्तर',
    },
    profile: {
      personalInfo: 'व्यक्तिगत जानकारी',
      name: 'नाम',
      email: 'ईमेल',
      phone: 'फोन',
      role: 'भूमिका',
      village: 'गांव',
      language: 'भाषा',
      changePassword: 'पासवर्ड बदलें',
      currentPassword: 'वर्तमान पासवर्ड',
      newPassword: 'नया पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
    },
  },
  // Add more languages as needed (Telugu, Tamil, Kannada)
};

type Language = 'en' | 'hi';
type TranslationKey = keyof typeof translations.en;
type NestedTranslationKey<T extends TranslationKey> = keyof typeof translations.en[T];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (section: TranslationKey, key: NestedTranslationKey<typeof section>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hi')) {
        setLanguageState(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const t = (section: TranslationKey, key: NestedTranslationKey<typeof section>): string => {
    try {
      const translation = translations[language]?.[section]?.[key as string];
      return translation || translations.en[section]?.[key as string] || `${section}.${key}`;
    } catch (error) {
      return `${section}.${key}`;
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};