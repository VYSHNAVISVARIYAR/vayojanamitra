import React, { createContext, useState, useContext } from 'react';

// Malayalam translations
const malayalamTranslations = {
  // Navigation
  'Home': 'ഹോം',
  'Explore Schemes': 'പദ്ധതികൾ പരിശോധിക്കുക',
  'Explore': 'പരിശോധിക്കുക',
  'Mitra': 'മിത്ര',
  'Alerts': 'അലേർട്ടുകൾ',
  'Profile': 'പ്രൊഫൈൽ',
  'Nearby Centers': 'അടുത്തുള്ള കേന്ദ്രങ്ങൾ',
  'Bookmarks': 'ബുക്ക്മാർക്കുകൾ',
  'My Alerts': 'എന്റെ അലേർട്ടുകൾ',
  'Logout': 'ലോഗൗട്ട്',
  'My Profile': 'എന്റെ പ്രൊഫൈൽ',
  'Login': 'ലോഗിൻ',
  'Register': 'രജിസ്റ്റർ',
  'Search schemes, benefits, eligibility...': 'പദ്ധതികൾ, ആനുകൂല്യങ്ങൾ, യോഗ്യത തിരയുക...',
  'Ask Mitra about': 'മിത്രയോട് ചോദിക്കുക',
  
  // Home Dashboard
  'Welcome back': 'വീണ്ടം സ്വാഗതം',
  'Here are schemes matched for you today': 'ഇന്ന് നിങ്ങൾക്ക് ചേർന്ന പദ്ധതികൾ',
  'Total Schemes': 'മൊത്തം പദ്ധതികൾ',
  'Bookmarked': 'ബുക്ക്മാർക്ക് ചെയ്തത്',
  'Unread Alerts': 'വായിക്കാത്ത അലേർട്ടുകൾ',
  'Eligibility Checks': 'യോഗ്യത പരിശോധനകൾ',
  'Recommended for You': 'നിങ്ങൾക്ക് ശുപാർശ ചെയ്യുന്നു',
  'View All': 'എല്ലാം കാണുക',
  'Browse by Category': 'വിഭാഗം അനുസരിച്ച് തിരയുക',
  'Recently Updated Schemes': 'അടുത്തിടെ അപ്ഡേറ്റ് ചെയ്ത പദ്ധതികൾ',
  'Ask Mitra': 'മിത്രയോട് ചോദിക്കുക',
  'Get help with schemes': 'പദ്ധതികളിൽ സഹായം നേടുക',
  'Find Nearby Office': 'അടുത്തുള്ള ഓഫീസ് കണ്ടെത്തുക',
  'Locate help centers': 'സഹായ കേന്ദ്രങ്ങൾ കണ്ടെത്തുക',
  'View Alerts': 'അലേർട്ടുകൾ കാണുക',
  'Stay updated': 'അപ്ഡേറ്റെഡ് ആയിരിക്കുക',
  
  // Categories
  'All Categories': 'എല്ലാ വിഭാഗങ്ങളും',
  'Pension': 'പെൻഷൻ',
  'Healthcare': 'ആരോഗ്യ സംരക്ഷണം',
  'Housing': 'ഭവനം',
  'Disability': 'വൈകല്യം',
  'Agriculture': 'കൃഷി',
  'Education': 'വിദ്യാഭ്യാസം',
  'General': 'പൊതു',
  
  // Scheme Explorer
  'Explore Schemes': 'പദ്ധതികൾ പരിശോധിക്കുക',
  'Search schemes...': 'പദ്ധതികൾ തിരയുക...',
  'Filters': 'ഫിൽട്ടറുകൾ',
  'Show Filters': 'ഫിൽട്ടറുകൾ കാണിക്കുക',
  'Hide Filters': 'ഫിൽട്ടറുകൾ മറയ്ക്കുക',
  'Category': 'വിഭാഗം',
  'Sort by': 'അനുസരിച്ച് അടുക്കുക',
  'Latest': 'ഏറ്റവും പുതിയത്',
  'A-Z': 'അ-ഹ',
  'Most Relevant': 'ഏറ്റവും പ്രസക്തമായത്',
  'Clear All Filters': 'എല്ലാ ഫിൽട്ടറുകളും മായ്ക്കുക',
  'Showing': 'കാണിക്കുന്നു',
  'schemes': 'പദ്ധതികൾ',
  'of': 'ലെ',
  'No schemes found': 'പദ്ധതികൾ കണ്ടെത്തിയില്ല',
  'Try different filters or search terms': 'വ്യത്യസ്ത ഫിൽട്ടറുകളോ തിരച്ചിൽ പദങ്ങളോ ശ്രമിക്കുക',
  'Previous': 'മുൻപത്തെ',
  'Next': 'അടുത്തത്',
  
  // Scheme Cards
  'View Details': 'വിശദാംശങ്ങൾ കാണുക',
  'Bookmark scheme': 'പദ്ധതി ബുക്ക്മാർക്ക് ചെയ്യുക',
  'Remove bookmark': 'ബുക്ക്മാർക്ക് നീക്കം ചെയ്യുക',
  'Today': 'ഇന്ന്',
  'Yesterday': 'ഇന്നലെ',
  'days ago': 'ദിവസം മുമ്പ്',
  'weeks ago': 'ആഴ്ച മുമ്പ്',
  'months ago': 'മാസം മുമ്പ്',
  
  // Nearby Centers
  'Nearby Help Centers': 'അടുത്തുള്ള സഹായ കേന്ദ്രങ്ങൾ',
  'Find government offices near you to apply for schemes': 'പദ്ധതികൾ അപേക്ഷിക്കുന്നതിന് അടുത്തുള്ള സർക്കാർ ഓഫീസുകൾ കണ്ടെത്തുക',
  'Select Your District': 'നിങ്ങളുടെ ജില്ല തിരഞ്ഞെടുക്കുക',
  'Social Welfare Office': 'സോഷ്യൽ വെൽഫെയർ ഓഫീസ്',
  'Akshaya Center': 'അക്ഷയ സെന്റർ',
  'Village Office': 'വില്ലേജ് ഓഫീസ്',
  'Panchayat Office': 'പഞ്ചായത്ത് ഓഫീസ്',
  'Your Location': 'നിങ്ങളുടെ സ്ഥാനം',
  'Get Directions': 'വഴി കാണിക്കുക',
  'Loading centers...': 'കേന്ദ്രങ്ങൾ ലോഡ് ചെയ്യുന്നു...',
  'Select a district to see nearby centers': 'അടുത്തുള്ള കേന്ദ്രങ്ങൾ കാണാൻ ഒരു ജില്ല തിരഞ്ഞെടുക്കുക',
  
  // Alerts
  'My Alerts': 'എന്റെ അലേർട്ടുകൾ',
  'Mark all as read': 'എല്ലാം വായിച്ചതായി അടയാളം',
  'Delete': 'ഇല്ലാതാക്കുക',
  'No alerts': 'അലേർട്ടുകളില്ല',
  'You have no unread alerts': 'നിങ്ങൾക്ക് വായിക്കാത്ത അലേർട്ടുകളില്ല',
  'New scheme available': 'പുതിയ പദ്ധതി ലഭ്യമാണ്',
  'Scheme deadline approaching': 'പദ്ധതി അവസാനിക്കുന്നത് അടുത്തു',
  'Application update': 'അപേക്ഷ അപ്ഡേറ്റ്',
  
  // Chatbot
  'Ask Mitra': 'മിത്രയോട് ചോദിക്കുക',
  'Type your message...': 'നിങ്ങളുടെ സന്ദേശം ടൈപ്പ് ചെയ്യുക...',
  'Send': 'അയയ്ക്കുക',
  'Voice': 'ശബ്ദം',
  'Stop Recording': 'റെക്കോർഡിംഗ് നിർത്തുക',
  'Start Recording': 'റെക്കോർഡിംഗ് ആരംഭിക്കുക',
  'Listening...': 'ശ്രദ്ധിക്കുന്നു...',
  'Processing...': 'പ്രോസസ്സിംഗ്...',
  'How can I help you today?': 'ഇന്ന് എങ്ങനെ സഹായിക്കാം?',
  'I am your AI assistant for government welfare schemes.': 'ഞാൻ സർക്കാർ ക്ഷേമ പദ്ധതികൾക്കുള്ള നിങ്ങളുടെ AI അസിസ്റ്റന്റ് ആണ്.',
  
  // Accessibility
  'Increase Font Size': 'അക്ഷര വലുപ്പം വർദ്ധിപ്പിക്കുക',
  'Decrease Font Size': 'അക്ഷര വലുപ്പം കുറയ്ക്കുക',
  'High Contrast': 'ഉയർന്ന കോൺട്രാസ്റ്റ്',
  'Normal Contrast': 'സാധാരണ കോൺട്രാസ്റ്റ്',
  'Read Aloud': 'ഉച്ചരിച്ച് വായിക്കുക',
  'Stop Reading': 'വായന നിർത്തുക',
  'Language': 'ഭാഷ',
  'English': 'ഇംഗ്ലീഷ്',
  'Malayalam': 'മലയാളം',
  
  // Profile Setup
  'Complete Your Profile': 'നിങ്ങളുടെ പ്രൊഫൈൽ പൂർത്തിയാക്കുക',
  'Step': 'ഘട്ടം',
  'of': 'ലെ',
  'Personal Information': 'വ്യക്തിഗത വിവരങ്ങൾ',
  'Full Name': 'പൂർണ്ണമായ പേര്',
  'Enter your full name': 'നിങ്ങളുടെ പൂർണ്ണമായ പേര് നൽകുക',
  'Age': 'പ്രായം',
  'Select age': 'പ്രായം തിരഞ്ഞെടുക്കുക',
  'Location & Occupation': 'സ്ഥാനവും തൊഴിലും',
  'District': 'ജില്ല',
  'Select your district': 'നിങ്ങളുടെ ജില്ല തിരഞ്ഞെടുക്കുക',
  'Occupation': 'തൊഴിൽ',
  'Select occupation': 'തൊഴിൽ തിരഞ്ഞെടുക്കുക',
  'Family & Financial Information': 'കുടുംബം & സാമ്പത്തിക വിവരങ്ങൾ',
  'Monthly Income Range': 'മാസിക വരുമാന പരിധി',
  'Select income range': 'വരുമാന പരിധി തിരഞ്ഞെടുക്കുക',
  'Family Size': 'കുടുംബ വലുപ്പം',
  'Select family size': 'കുടുംബ വലുപ്പം തിരഞ്ഞെടുക്കുക',
  'person': 'ആൾ',
  'people': 'ആൾ',
  'Health & Accessibility': 'ആരോഗ്യം & ആക്സസസിബിലിറ്റി',
  'This information helps us find relevant schemes for you (optional)': 'ഈ വിവരങ്ങൾ നിങ്ങൾക്ക് പ്രസക്തമായ പദ്ധതികൾ കണ്ടെത്താൻ സഹായിക്കുന്നു (ഓപ്ഷണൽ)',
  'Health Conditions': 'ആരോഗ്യ അവസ്ഥ',
  'Disabilities': 'വൈകല്യങ്ങൾ',
  'Previous': 'മുൻപത്തെ',
  'Next': 'അടുത്തത്',
  'Saving...': 'സംരക്ഷിക്കുന്നു...',
  'Complete Setup': 'സെറ്റപ്പ് പൂർത്തിയാക്കുക',
  
  // Additional translations for ProfileSetup
  'Government Employee': 'സർക്കാർ ജീവനക്കാരൻ',
  'Private Sector': 'സ്വകാര്യ മേഖല',
  'Self-Employed': 'സ്വയം തൊഴിൽ ചെയ്യുന്നവൻ',
  'Agriculture': 'കൃഷി',
  'Retired': 'വിരമിച്ച',
  'Homemaker': 'വീട്ടമ്മ',
  'Student': 'വിദ്യാർത്ഥി',
  'Other': 'മറ്റുള്ളവ',
  'Below 10,000': '10,000-ന് താഴെ',
  'Diabetes': 'പ്രമേഹം',
  'Hypertension': 'രക്താതിശയം',
  'Heart Disease': 'ഹൃദയരോഗം',
  'Arthritis': 'ആർത്രൈറ്റിസ്',
  'Vision Impairment': 'കാഴ്ച വൈകല്യം',
  'Hearing Impairment': 'ശ്രവണ വൈകല്യം',
  'Mobility Issues': 'ചലന പ്രശ്നങ്ങൾ',
  'None': 'ഒന്നുമില്ല',
  'Physical Disability': 'ശാരീരിക വൈകല്യം',
  'Speech Impairment': 'സംസാര വൈകല്യം',
  'Mental Disability': 'മാനസിക വൈകല്യം',
};

const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState('english');
  const [isMalayalam, setIsMalayalam] = useState(false);

  const toggleLanguage = () => {
    const newLang = language === 'english' ? 'malayalam' : 'english';
    setLanguage(newLang);
    setIsMalayalam(newLang === 'malayalam');
    localStorage.setItem('preferredLanguage', newLang);
  };

  const translate = (text) => {
    if (language === 'malayalam' && malayalamTranslations[text]) {
      return malayalamTranslations[text];
    }
    return text;
  };

  // Load saved language preference
  React.useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'english';
    setLanguage(savedLanguage);
    setIsMalayalam(savedLanguage === 'malayalam');
  }, []);

  return (
    <TranslationContext.Provider value={{
      language,
      isMalayalam,
      toggleLanguage,
      translate
    }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};
