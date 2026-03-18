from typing import Dict, Any
import httpx
from config import settings

class SchemeSimplifier:
    def __init__(self):
        self.cache = {}

    async def simplify_scheme(self, scheme: Dict[str, Any]) -> str:
        """Simplify scheme description for elderly users."""
        try:
            # Check cache first
            cache_key = f"{scheme.get('_id', '')}_simplified"
            if cache_key in self.cache:
                return self.cache[cache_key]
            
            # Build prompt for AI
            prompt = f"""
You are helping elderly citizens of Kerala understand government schemes.
Rewrite this scheme information in very simple, clear English.
Use short sentences. Avoid government jargon.
Explain benefits in concrete terms (e.g., "You will get Rs 1600 every month").
Keep it under 150 words.

Scheme: {scheme.get('title', 'Unknown')}
Description: {scheme.get('description', 'No description available')}
Benefits: {scheme.get('benefits', 'No benefits listed')}
Eligibility: {scheme.get('eligibility', 'No eligibility criteria')}
"""
            
            from utils.llm import call_llm
            simplified = await call_llm(prompt, max_tokens=1000)
            
            if not simplified:
                raise Exception("LLM returned empty response")
            
            # Cache the result
            self.cache[cache_key] = simplified
            
            return simplified
            
        except Exception as e:
            print(f"Error simplifying scheme: {e}")
            # Return a simple fallback
            return self._generate_fallback_simplification(scheme)
    
    def _generate_fallback_simplification(self, scheme: Dict[str, Any]) -> str:
        """Generate a simple fallback when AI is unavailable."""
        title = scheme.get('title', 'This scheme')
        benefits = scheme.get('benefits', 'various benefits')
        eligibility = scheme.get('eligibility', 'certain eligibility criteria')
        
        # Simple template-based simplification
        simplified = f"""
{title} provides {benefits.lower()}. 
This government scheme helps people who meet {eligibility.lower()}. 
You can apply at your nearest government office. 
Contact Vayojanamitra for help with the application process.
        """.strip()
        
        return simplified

# Global instance
simplifier = SchemeSimplifier()
