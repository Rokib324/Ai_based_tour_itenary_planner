import os
import joblib
from datetime import date
from django.conf import settings
from decimal import Decimal
from tours.models import (
    Tour, 
    TourItem, 
    TourPackage, 
    FlightService, 
    HotelService, 
    RestaurantService, 
    RideService
)

class AIEngine:
    def __init__(self):
        self.model_dir = os.path.join(settings.BASE_DIR, 'tours', 'ml_models')
        
        # Load models
        try:
            self.approval_model = joblib.load(os.path.join(self.model_dir, 'approval_model.joblib'))
            self.approval_scaler = joblib.load(os.path.join(self.model_dir, 'approval_scaler.joblib'))
        except Exception:
            self.approval_model = None
            self.approval_scaler = None
            
        try:
            self.cost_model = joblib.load(os.path.join(self.model_dir, 'cost_model.joblib'))
            self.cost_scaler = joblib.load(os.path.join(self.model_dir, 'cost_scaler.joblib'))
        except Exception:
            self.cost_model = None
            self.cost_scaler = None

    def get_destination_recommendations(self, user_profile):
        """
        Recommends TourPackages matching the user's travel preferences.
        Uses a similarity score based on budget tier and preferred style.
        """
        packages = TourPackage.objects.filter(is_active=True)
        recommended = []
        
        pref_tier = user_profile.preferred_budget_tier
        pref_style = user_profile.preferred_travel_style or ""
        pref_food = user_profile.preferred_food or ""
        
        for pkg in packages:
            score = 0
            
            # Match budget tier
            if pkg.budget_tier == pref_tier:
                score += 50
                
            # Keyword matching in title and description
            desc_lower = pkg.description.lower() + pkg.title.lower()
            if pref_style.lower() and pref_style.lower() in desc_lower:
                score += 30
            if pref_food.lower() and pref_food.lower() in desc_lower:
                score += 20
                
            recommended.append({
                'package_id': pkg.id,
                'title': pkg.title,
                'destination': pkg.destination,
                'budget_tier': pkg.budget_tier,
                'base_price': pkg.base_price,
                'score': score
            })
            
        # Sort by similarity score descending
        recommended = sorted(recommended, key=lambda x: x['score'], reverse=True)
        return recommended[:5]

    def get_cheaper_alternatives(self, tour):
        """
        Scans service catalogs for cheaper alternatives for each selected item in the tour.
        """
        alternatives = []
        
        for item in tour.items.all():
            item_alt = None
            
            # Check Flight
            if item.flight:
                cheaper = FlightService.objects.filter(
                    departure_city=item.flight.departure_city,
                    destination_city=item.flight.destination_city,
                    price__lt=item.flight.price,
                    is_available=True
                ).order_list = '-price'  # Get closest cheaper alternative
                
                cheapest = cheaper.order_by('price').first()
                if cheapest:
                    item_alt = {
                        'item_type': 'Flight',
                        'current_name': f"{item.flight.name} ({item.flight.flight_number})",
                        'current_price': float(item.flight.price),
                        'alt_id': cheapest.id,
                        'alt_name': f"{cheapest.name} ({cheapest.flight_number})",
                        'alt_price': float(cheapest.price),
                        'savings': float(item.flight.price - cheapest.price)
                    }
                    
            # Check Hotel
            elif item.hotel:
                cheaper = HotelService.objects.filter(
                    location=item.hotel.location,
                    price_per_night__lt=item.hotel.price_per_night,
                    is_available=True
                ).order_by('price_per_night').first()
                
                if cheaper:
                    current_cost = float(item.hotel.price_per_night * item.quantity)
                    alt_cost = float(cheaper.price_per_night * item.quantity)
                    item_alt = {
                        'item_type': 'Hotel',
                        'current_name': f"{item.hotel.name} ({item.hotel.room_type})",
                        'current_price': float(item.hotel.price_per_night),
                        'alt_id': cheaper.id,
                        'alt_name': f"{cheaper.name} ({cheaper.room_type})",
                        'alt_price': float(cheaper.price_per_night),
                        'savings': current_cost - alt_cost
                    }
                    
            # Check Restaurant
            elif item.restaurant:
                cheaper = RestaurantService.objects.filter(
                    location=item.restaurant.location,
                    price_per_meal__lt=item.restaurant.price_per_meal,
                    is_available=True
                ).order_by('price_per_meal').first()
                
                if cheaper:
                    current_cost = float(item.restaurant.price_per_meal * item.quantity)
                    alt_cost = float(cheaper.price_per_meal * item.quantity)
                    item_alt = {
                        'item_type': 'Restaurant',
                        'current_name': item.restaurant.name,
                        'current_price': float(item.restaurant.price_per_meal),
                        'alt_id': cheaper.id,
                        'alt_name': cheaper.name,
                        'alt_price': float(cheaper.price_per_meal),
                        'savings': current_cost - alt_cost
                    }
                    
            # Check Ride
            elif item.ride:
                cheaper = RideService.objects.filter(
                    location=item.ride.location,
                    price_per_km__lt=item.ride.price_per_km,
                    is_available=True
                ).order_by('price_per_km').first()
                
                if cheaper:
                    current_cost = float(item.ride.price_per_km * item.quantity)
                    alt_cost = float(cheaper.price_per_km * item.quantity)
                    item_alt = {
                        'item_type': 'Ride',
                        'current_name': f"{item.ride.vehicle_type} by {item.ride.provider_name}",
                        'current_price': float(item.ride.price_per_km),
                        'alt_id': cheaper.id,
                        'alt_name': f"{cheaper.vehicle_type} by {cheaper.provider_name}",
                        'alt_price': float(cheaper.price_per_km),
                        'savings': current_cost - alt_cost
                    }
                    
            if item_alt:
                alternatives.append(item_alt)
                
        return alternatives

    def get_weather_recommendations(self, destination):
        """
        Simulates destination weather details.
        In a production deployment, this maps to external Weather APIs.
        """
        # Static mock database for demonstration
        weather_db = {
            'nyc': {'temp': '22C', 'condition': 'Sunny', 'best_months': 'May to Oct', 'alert': None},
            'london': {'temp': '15C', 'condition': 'Rainy', 'best_months': 'Jun to Sep', 'alert': 'Carry an umbrella.'},
            'dubai': {'temp': '40C', 'condition': 'Very Hot', 'best_months': 'Nov to Mar', 'alert': 'High UV index, stay hydrated.'},
            'dhaka': {'temp': '32C', 'condition': 'Humid / Monsoon', 'best_months': 'Nov to Feb', 'alert': 'Monsoon season active. High chance of rain.'}
        }
        
        dest_key = destination.lower().strip()
        for key, value in weather_db.items():
            if key in dest_key:
                return value
                
        # Default fallback
        return {'temp': '24C', 'condition': 'Mild', 'best_months': 'Oct to Apr', 'alert': 'Check local forecasts before travel.'}

    def predict_approval_probability(self, tour):
        """
        Feeds tour parameters into the trained Logistic Regression model.
        Returns the approval probability percentage (0 to 100).
        """
        if not self.approval_model or not self.approval_scaler:
            return 80.0  # Fallback baseline
            
        # 1. Feature Extraction
        total_cost = float(tour.final_price)
        
        # budget_tier_code (0=BUDGET, 1=STANDARD, 2=LUXURY)
        tier_map = {'BUDGET': 0, 'STANDARD': 1, 'LUXURY': 2, 'CUSTOM': 1}
        budget_tier_code = tier_map.get(tour.budget_tier, 1)
        
        has_flight = 1 if tour.items.filter(flight__isnull=False).exists() else 0
        has_hotel = 1 if tour.items.filter(hotel__isnull=False).exists() else 0
        has_restaurant = 1 if tour.items.filter(restaurant__isnull=False).exists() else 0
        has_ride = 1 if tour.items.filter(ride__isnull=False).exists() else 0
        
        # User approval rate (calculate past tours status)
        past_tours = Tour.objects.filter(traveler=tour.traveler).exclude(id=tour.id)
        if past_tours.exists():
            approved_count = past_tours.filter(status__in=[Tour.Status.UNLOCKED, Tour.Status.COMPLETED]).count()
            user_approval_rate = approved_count / past_tours.count()
        else:
            user_approval_rate = 1.0 # Default fallback
            
        # 2. Build input array
        features = [[
            total_cost,
            budget_tier_code,
            has_flight,
            has_hotel,
            has_restaurant,
            has_ride,
            user_approval_rate
        ]]
        
        # 3. Predict probability
        features_scaled = self.approval_scaler.transform(features)
        prob = self.approval_model.predict_proba(features_scaled)[0][1] # Probability of class 1 (approved)
        return round(float(prob * 100), 2)

    def predict_future_cost(self, tour):
        """
        Predicts future price for this tour structure starting at target date.
        """
        if not self.cost_model or not self.cost_scaler:
            return float(tour.base_cost * Decimal('1.05')) # Fallback inflation prediction
            
        base_cost = float(tour.base_cost)
        days_ahead = (tour.start_date - date.today()).days
        if days_ahead < 0:
            days_ahead = 0
            
        month = tour.start_date.month
        
        tier_map = {'BUDGET': 0, 'STANDARD': 1, 'LUXURY': 2, 'CUSTOM': 1}
        budget_tier_code = tier_map.get(tour.budget_tier, 1)
        
        features = [[
            base_cost,
            days_ahead,
            month,
            budget_tier_code
        ]]
        
        features_scaled = self.cost_scaler.transform(features)
        pred = self.cost_model.predict(features_scaled)[0]
        return round(float(pred), 2)
