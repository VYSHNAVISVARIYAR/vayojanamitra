from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, List, Any
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
        
        return locations
    
    def generate_maps_url(self, location_name: str, district: str) -> str:
        """Generate Google Maps URL for a location."""
        query = f"{location_name.replace(' ', '+')}+{district.replace(' ', '+')}+Kerala"
        return f"https://maps.google.com/?q={query}"

location_service = LocationService()
        self, 
        district: str, 
        center_type: str = None, 
        category: str = None
    ) -> List[Dict[str, Any]]:
        """Get help centers filtered by district and optional filters."""
        try:
            # Build filter query
            filter_query = {"district": district}
            
            if center_type and center_type != "All":
                filter_query["type"] = center_type
                
            if category and category != "All":
                filter_query["schemes_handled"] = category
            
            # Query centers
            cursor = self.db.help_centers.find(filter_query)
            centers = await cursor.to_list(None)
            
            # Convert ObjectId to string
            for center in centers:
                if "_id" in center:
                    center["_id"] = str(center["_id"])
            
            # Sort by type priority
            type_priority = {
                "Social Welfare Office": 1,
                "Akshaya Center": 2,
                "Village Office": 3,
                "Panchayat Office": 4
            }
            
            centers.sort(key=lambda x: type_priority.get(x.get("type", ""), 99))
            
            return centers
            
        except Exception as e:
            print(f"Error getting centers: {e}")
            return []

    async def get_nearest_centers(
        self, 
        district: str, 
        scheme_category: str
    ) -> List[Dict[str, Any]]:
        """Get top 3 most relevant centers for district and scheme category."""
        try:
            # Build filter query
            filter_query = {
                "district": district,
                "schemes_handled": scheme_category
            }
            
            # Query centers
            cursor = self.db.help_centers.find(filter_query)
            centers = await cursor.to_list(None)
            
            # Convert ObjectId to string
            for center in centers:
                if "_id" in center:
                    center["_id"] = str(center["_id"])
            
            # Sort by type priority and return top 3
            type_priority = {
                "Social Welfare Office": 1,
                "Akshaya Center": 2,
                "Village Office": 3,
                "Panchayat Office": 4
            }
            
            centers.sort(key=lambda x: type_priority.get(x.get("type", ""), 99))
            
            return centers[:3]
            
        except Exception as e:
            print(f"Error getting nearest centers: {e}")
            return []
