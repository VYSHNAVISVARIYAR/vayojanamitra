import re
from typing import Dict, Any, Optional
from config import settings

class LanguageService:
    def __init__(self):
        self.malayalam_pattern = re.compile(r'[\u0D00-\u0D7F]')
        self.english_pattern = re.compile(r'[a-zA-Z]')
        
        # Common Malayalam to English translations for scheme terms
        self.translations = {
            # Scheme types
            'പെൻഷൻ': 'Pension',
            'പെന്‍ഷന്‍': 'Pension',
            'വിധവ': 'Widow',
            'വയസ്': 'Age',
            'അവിവാഹിത': 'Unmarried',
            'സാമൂഹ്യ': 'Social',
            'സുരക്ഷാ': 'Security',
            'തെറ്റായി': 'Deserted',
            'സസ്പെന്റ്': 'Suspended',
            'കർഷക': 'Farmer',
            'കർഷകർ': 'Farmers',
            'കൃഷി': 'Agriculture',
            'ആരോഗ്യ': 'Health',
            'വൈദ്യ': 'Medical',
            'വിദ്യാഭ്യാസ': 'Education',
            'തൊഴിൽ': 'Employment',
            'താമസ': 'Housing',
            'ഭവന': 'House',
            'സഹായ': 'Help',
            'അസം': 'Scheme',
            'സഹായത': 'Assistance',
            'നിധി': 'Fund',
            'പദ്ധതി': 'System',
            'പദ്ധതികൾ': 'Schemes',
            'ജീവനാംശ': 'Livelihood',
            'സ്വയംതൊഴിൽ': 'Self Employment',
            'വാർദ്ധക്യ': 'Old Age',
            'വിരുദ്ധ': 'Elderly',
            'വൃദ്ധ': 'Elderly',
            'മുതിർന്ന': 'Senior',
            'മുതിർന്നവർ': 'Senior Citizens',
            'അന്ധർ': 'Blind',
            'ബധിരർ': 'Disabled',
            'വികലാംഗർ': 'Differently Abled',
            'ദാരിദ്ര്യം': 'Poverty',
            'ദരിദ്രർ': 'Poor',
            'ബിപിഎൽ': 'BPL',
            'സാമ്പത്തി': 'Wealth',
            'സാമ്പത്തിക': 'Financial',
            'സാല': 'Bank',
            'വായ്പ': 'Loan',
            'നിക്ഷേപം': 'Investment',
            'സംരക്ഷണം': 'Protection',
            'പിന്തുണ': 'Support',
            'ആശ്വാസം': 'Relief',
            'അർഹത': 'Eligibility',
            'നിബന്ധനങ്ങൾ': 'Conditions',
            'നിർദ്ദേശങ്ങൾ': 'Guidelines',
            'അപേക്ഷ': 'Application',
            'അപേക്ഷാ ഫോർം': 'Application Form',
            'അപേക്ഷിക്കുക': 'Apply',
            'തിയതി': 'Deadline',
            'അവസാനതിയതി': 'Last Date',
            'വിവരം': 'Information',
            'വിശദീകരണം': 'Explanation',
            'വിശദീകരിക്കുക': 'Clarify',
            'മാർഗ്ഗനിർദ്ദേശങ്ങൾ': 'Guidelines',
            'നടപടി': 'Action',
            'നടപടികൾ': 'Actions',
            'നടപ്പാക്കുക': 'Implement',
            'പദ്ധതി': 'Scheme',
            'പദ്ധതികൾ': 'Schemes',
            'സർക്കാർ': 'Government',
            'സർക്കാർ സംവിധാനം': 'Government Scheme',
            'സംസ്ഥ': 'Institution',
            'ഓഫീസ്': 'Office',
            'വകുപ്പ്': 'Department',
            'അധികൃതർ': 'Officers',
            'ഉദ്യോഗസ്ഥർ': 'Officials',
            'ഉദ്യോഗസ്ഥന്മാർ': 'Officials'
        }
    
    def detect_language(self, text: str) -> str:
        """Detect if text is primarily Malayalam or English."""
        if not text:
            return 'unknown'
        
        # Count Malayalam and English characters
        malayalam_chars = len(self.malayalam_pattern.findall(text))
        english_chars = len(self.english_pattern.findall(text))
        
        # Determine primary language
        if malayalam_chars > english_chars:
            return 'malayalam'
        elif english_chars > malayalam_chars:
            return 'english'
        else:
            return 'mixed'
    
    def translate_malayalam_to_english(self, text: str) -> str:
        """Translate Malayalam text to English using dictionary mapping."""
        if not text:
            return text
        
        translated = text
        for malayalam_word, english_word in self.translations.items():
            translated = translated.replace(malayalam_word, english_word)
        
        # Clean up extra spaces and formatting
        translated = re.sub(r'\s+', ' ', translated).strip()
        
        return translated
    
    async def standardize_scheme_language(self, scheme: Dict[str, Any], target_language: str = 'english') -> Dict[str, Any]:
        """Standardize a scheme to the target language using LLM for full translation."""
        standardized_scheme = scheme.copy()
        
        # Get current language of title
        title = scheme.get('title', '')
        title_lang = self.detect_language(title)
        
        # If title is pure target language, we still might want to check the full text
        # But for performance, we only translate if we detect Malayalam or Mix
        if title_lang == 'english' and not self.malayalam_pattern.search(title):
            # Check description too
            desc = scheme.get('description', '')
            if not self.malayalam_pattern.search(desc):
                return standardized_scheme
        
        # Use LLM to translate the entire scheme content to ensure no mix
        prompt = f"""
        Translate the following Kerala government welfare scheme details into pure {target_language}.
        The current text might be in Malayalam, English, or a mix of both.
        Ensure the output is natural, professional, and ONLY in {target_language}. 
        Do not include any Malayalam characters in the output.
        
        Title: {scheme.get('title', '')}
        Description: {scheme.get('description', '')}
        Benefits: {scheme.get('benefits', '')}
        Eligibility: {scheme.get('eligibility', '')}
        
        Return ONLY a JSON with keys: 'title', 'description', 'benefits', 'eligibility'.
        """
        
        try:
            from utils.llm import call_llm
            import json
            
            response = await call_llm(prompt, max_tokens=2000)
            if response:
                # Try to extract JSON from response
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    translated_data = json.loads(json_match.group())
                    standardized_scheme.update(translated_data)
        except Exception as e:
            print(f"Error during LLM translation in language_service: {e}")
            # Fallback to dictionary translation for title
            if title_lang != target_language:
                standardized_scheme['title'] = self.translate_malayalam_to_english(title)
        
        # Add language metadata
        standardized_scheme['language'] = target_language
        standardized_scheme['original_language'] = title_lang
        
        return standardized_scheme
    
    def get_language_preference(self, user_profile: Dict[str, Any]) -> str:
        """Determine user's language preference from profile."""
        # Check if user has explicit language preference
        preferred_lang = user_profile.get('preferred_language', 'english')
        
        # Or infer from location/other factors
        if preferred_lang == 'unknown':
            # Default to English for now, but could be smarter
            preferred_lang = 'english'
        
        return preferred_lang

# Global instance
language_service = LanguageService()
