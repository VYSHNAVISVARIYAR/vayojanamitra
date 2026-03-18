from typing import List, Dict, Any
from .location_data import get_locations_for_district

class LocationService:
    def __init__(self):
        pass
    
    def get_nearby_centers(self, district: str, scheme_types: List[str] = None) -> List[Dict[str, Any]]:
        """Get nearby centers based on district and scheme types."""
        locations = get_locations_for_district(district)
        
        if scheme_types:
            # Filter locations that handle the requested scheme types
            filtered_locations = []
            for location in locations:
                location_schemes = location.get("schemes_handled", [])
                if any(scheme in location_schemes for scheme in scheme_types):
                    filtered_locations.append(location)
            locations = filtered_locations
        
        # Add Google Maps URLs dynamically
        for location in locations:
            location["google_maps_url"] = self.generate_maps_url(location["name"], district)
        
        return locations
    
    def generate_maps_url(self, location_name: str, district: str) -> str:
        """Generate Google Maps URL for a location."""
        query = f"{location_name.replace(' ', '+')}+{district.replace(' ', '+')}+Kerala"
        return f"https://maps.google.com/?q={query}"

location_service = LocationService()
