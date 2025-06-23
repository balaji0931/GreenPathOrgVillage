import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Language resources
const resources = {
  en: {
    translation: {
      "app": {
        "title": "GreenPath Org",
        "loading": "Loading...",
        "error": "An error occurred",
        "success": "Success!",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "view": "View",
        "search": "Search",
        "filter": "Filter",
        "clear": "Clear",
        "submit": "Submit",
        "close": "Close",
        "back": "Back",
        "next": "Next",
        "previous": "Previous",
        "refresh": "Refresh",
        "export": "Export",
        "download": "Download"
      },
      "auth": {
        "login": "Login",
        "logout": "Logout",
        "userId": "User ID",
        "password": "Password",
        "loginButton": "Sign In",
        "loginError": "Invalid credentials",
        "unauthorized": "Unauthorized access",
        "sessionExpired": "Session expired"
      },
      "navigation": {
        "dashboard": "Dashboard",
        "households": "Households",
        "collectors": "Collectors",
        "collections": "Collections",
        "issues": "Issues",
        "feedback": "Feedback",
        "reports": "Reports",
        "announcements": "Announcements",
        "villages": "Villages",
        "managers": "Managers",
        "profile": "Profile",
        "settings": "Settings"
      },
      "dashboard": {
        "welcome": "Welcome",
        "overview": "Overview",
        "stats": "Statistics",
        "recentActivity": "Recent Activity",
        "quickActions": "Quick Actions"
      }
    }
  },
  hi: {
    translation: {
      "app": {
        "title": "ग्रीनपाथ ऑर्ग",
        "loading": "लोड हो रहा है...",
        "error": "एक त्रुटि हुई",
        "success": "सफल!",
        "save": "सहेजें",
        "cancel": "रद्द करें",
        "delete": "हटाएं",
        "edit": "संपादित करें",
        "view": "देखें",
        "search": "खोजें",
        "filter": "फिल्टर",
        "clear": "साफ करें",
        "submit": "जमा करें",
        "close": "बंद करें",
        "back": "पीछे",
        "next": "आगे",
        "previous": "पिछला",
        "refresh": "रीफ्रेश",
        "export": "निर्यात",
        "download": "डाउनलोड"
      },
      "auth": {
        "login": "लॉगिन",
        "logout": "लॉगआउट",
        "userId": "उपयोगकर्ता आईडी",
        "password": "पासवर्ड",
        "loginButton": "साइन इन",
        "loginError": "गलत प्रमाण-पत्र",
        "unauthorized": "अनधिकृत पहुंच",
        "sessionExpired": "सत्र समाप्त"
      },
      "navigation": {
        "dashboard": "डैशबोर्ड",
        "households": "घर",
        "collectors": "संग्रहकर्ता",
        "collections": "संग्रह",
        "issues": "समस्याएं",
        "feedback": "प्रतिक्रिया",
        "reports": "रिपोर्ट",
        "announcements": "घोषणाएं",
        "villages": "गांव",
        "managers": "प्रबंधक",
        "profile": "प्रोफाइल",
        "settings": "सेटिंग्स"
      },
      "dashboard": {
        "welcome": "स्वागत",
        "overview": "अवलोकन",
        "stats": "आंकड़े",
        "recentActivity": "हाल की गतिविधि",
        "quickActions": "त्वरित कार्य"
      }
    }
  },
  te: {
    translation: {
      "app": {
        "title": "గ్రీన్‌పాత్ ఆర్గ్",
        "loading": "లోడవుతోంది...",
        "error": "ఒక లోపం జరిగింది",
        "success": "విజయవంతం!",
        "save": "సేవ్ చేయండి",
        "cancel": "రద్దు చేయండి",
        "delete": "తొలగించండి",
        "edit": "సవరించండి",
        "view": "చూడండి",
        "search": "వెతకండి",
        "filter": "ఫిల్టర్",
        "clear": "క్లియర్ చేయండి",
        "submit": "సమర్పించండి",
        "close": "మూసివేయండి",
        "back": "వెనుకకు",
        "next": "తదుపరి",
        "previous": "మునుపటి",
        "refresh": "రిఫ్రెష్",
        "export": "ఎగుమతి",
        "download": "డౌన్‌లోడ్"
      },
      "auth": {
        "login": "లాగిన్",
        "logout": "లాగ్ అవుట్",
        "userId": "వినియోగదారు ID",
        "password": "పాస్‌వర్డ్",
        "loginButton": "సైన్ ఇన్",
        "loginError": "తప్పు ఆధారాలు",
        "unauthorized": "అనధికార ప్రవేశం",
        "sessionExpired": "సెషన్ ముగిసింది"
      },
      "navigation": {
        "dashboard": "డాష్‌బోర్డ్",
        "households": "ఇళ్ళు",
        "collectors": "సేకరణకర్తలు",
        "collections": "సేకరణలు",
        "issues": "సమస్యలు",
        "feedback": "ఫీడ్‌బ్యాక్",
        "reports": "నివేదికలు",
        "announcements": "ప్రకటనలు",
        "villages": "గ్రామాలు",
        "managers": "నిర్వాహకులు",
        "profile": "ప్రొఫైల్",
        "settings": "సెట్టింగ్‌లు"
      },
      "dashboard": {
        "welcome": "స్వాగతం",
        "overview": "అవలోకనం",
        "stats": "గణాంకాలు",
        "recentActivity": "ఇటీవల కార్యకలాపాలు",
        "quickActions": "త్వరిత చర్యలు"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;