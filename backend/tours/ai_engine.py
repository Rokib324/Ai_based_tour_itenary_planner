import os
import json
import requests
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
        
        # Load local models as fallbacks
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

    def _call_gemini(self, prompt):
        """
        Private helper to request structured JSON from the Gemini 2.5 Flash API.
        """
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            return None
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                res_data = response.json()
                text_response = res_data['candidates'][0]['content']['parts'][0]['text']
                return json.loads(text_response.strip())
        except Exception as e:
            # Silent logging
            print(f"Gemini API call failed: {e}")
        return None

    def get_destination_recommendations(self, user_profile):
        """
        Recommends TourPackages matching the user's travel preferences.
        Queries Gemini API to score and rank available TourPackages,
        with a fallback to local cosine similarity matching.
        """
        packages = TourPackage.objects.filter(is_active=True)
        if not packages.exists():
            return []

        pref_tier = user_profile.preferred_budget_tier
        pref_style = user_profile.preferred_travel_style or "General"
        pref_food = user_profile.preferred_food or "General"

        # Try Gemini API if key is present
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if api_key:
            # Prepare packages payload
            packages_list = []
            for p in packages:
                packages_list.append({
                    'id': p.id,
                    'title': p.title,
                    'destination': p.destination,
                    'budget_tier': p.budget_tier,
                    'base_price': float(p.base_price),
                    'description': p.description
                })

            prompt = (
                "You are an AI travel recommender. Review the traveler's profile:\n"
                f"- Preferred Budget Tier: {pref_tier}\n"
                f"- Travel Style: {pref_style}\n"
                f"- Food Preference: {pref_food}\n\n"
                f"Rate the following packages from 0.0 to 100.0 based on how well they fit these preferences:\n"
                f"{json.dumps(packages_list)}\n\n"
                "Return a JSON array of objects. Each object must contain these exact keys:\n"
                "- 'package_id' (integer, matching the package id)\n"
                "- 'title' (string)\n"
                "- 'description' (string)\n"
                "- 'destination' (string)\n"
                "- 'budget_tier' (string)\n"
                "- 'base_price' (float)\n"
                "- 'score' (float, rating from 0.0 to 100.0)\n\n"
                "Sort the array by score descending. Return at most 5 items."
            )

            gemini_res = self._call_gemini(prompt)
            if gemini_res and isinstance(gemini_res, list):
                # Format to match expectations
                formatted = []
                for item in gemini_res[:5]:
                    formatted.append({
                        'package_id': item.get('package_id'),
                        'title': item.get('title'),
                        'description': item.get('description'),
                        'destination': item.get('destination'),
                        'budget_tier': item.get('budget_tier'),
                        'base_price': Decimal(str(item.get('base_price', 0.00))),
                        'score': float(item.get('score', 0.0))
                    })
                return formatted

        # Local fallback heuristic matching
        recommended = []
        for pkg in packages:
            score = 0
            if pkg.budget_tier == pref_tier:
                score += 50
                
            desc_lower = pkg.description.lower() + pkg.title.lower()
            if pref_style.lower() and pref_style.lower() in desc_lower:
                score += 30
            if pref_food.lower() and pref_food.lower() in desc_lower:
                score += 20
                
            recommended.append({
                'package_id': pkg.id,
                'title': pkg.title,
                'description': pkg.description,
                'destination': pkg.destination,
                'budget_tier': pkg.budget_tier,
                'base_price': pkg.base_price,
                'score': float(score)
            })
            
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
                ).order_by('price').first()
                
                if cheaper:
                    item_alt = {
                        'item_type': 'Flight',
                        'current_name': f"{item.flight.name} ({item.flight.flight_number})",
                        'current_price': float(item.flight.price),
                        'alt_id': cheaper.id,
                        'alt_name': f"{cheapest.name} ({cheapest.flight_number})" if 'cheapest' in locals() else f"{cheaper.name} ({cheaper.flight_number})",
                        'alt_price': float(cheaper.price),
                        'savings': float(item.flight.price - cheaper.price)
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
        Queries Gemini API to fetch weather details, temperatures, and alerts,
        with a fallback to local mock database.
        """
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if api_key:
            prompt = (
                f"Provide simulated current weather details for destination: '{destination}'.\n"
                "Return a JSON object with these exact keys:\n"
                "- 'temp' (string, e.g. '25C')\n"
                "- 'condition' (string, e.g. 'Sunny' or 'Rainy')\n"
                "- 'best_months' (string, e.g. 'Nov to Mar')\n"
                "- 'alert' (string, weather alert / reminder, or null if none)\n"
            )
            gemini_res = self._call_gemini(prompt)
            if gemini_res and isinstance(gemini_res, dict):
                return {
                    'temp': gemini_res.get('temp', '24C'),
                    'condition': gemini_res.get('condition', 'Mild'),
                    'best_months': gemini_res.get('best_months', 'Oct to Apr'),
                    'alert': gemini_res.get('alert')
                }

        # Local fallback dictionary
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
                
        return {'temp': '24C', 'condition': 'Mild', 'best_months': 'Oct to Apr', 'alert': 'Check local forecasts before travel.'}

    def predict_approval_probability(self, tour):
        """
        Predicts approval rate using Gemini API based on itinerary cost, budget tier,
        and past traveler records, falling back to local Logistic Regression model.
        """
        total_cost = float(tour.final_price)
        
        # User approval rate (calculate past tours status)
        past_tours = Tour.objects.filter(traveler=tour.traveler).exclude(id=tour.id)
        if past_tours.exists():
            approved_count = past_tours.filter(status__in=[Tour.Status.UNLOCKED, Tour.Status.COMPLETED]).count()
            user_approval_rate = approved_count / past_tours.count()
        else:
            user_approval_rate = 1.0 # Default fallback

        # Try Gemini API
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if api_key:
            items_list = []
            for item in tour.items.all():
                if item.flight:
                    items_list.append(f"Flight: {item.flight.name} ({item.flight.departure_city} to {item.flight.destination_city}) - ${item.flight.price}")
                elif item.hotel:
                    items_list.append(f"Hotel: {item.hotel.name} ({item.hotel.location}) - ${item.hotel.price_per_night} x {item.quantity} nights")
                elif item.restaurant:
                    items_list.append(f"Restaurant: {item.restaurant.name} - ${item.restaurant.price_per_meal} x {item.quantity} meals")
                elif item.ride:
                    items_list.append(f"Ride: {item.ride.vehicle_type} by {item.ride.provider_name} - ${item.ride.price_per_km} x {item.quantity} km")

            prompt = (
                "You are an AI decision engine auditing a traveler's custom tour itinerary proposal.\n"
                "Evaluate the probability that this tour will be approved by service managers.\n"
                f"- Tour Title: {tour.title}\n"
                f"- Budget Tier: {tour.budget_tier}\n"
                f"- Total Cost: ${total_cost}\n"
                f"- Traveler Past Approval Rate: {user_approval_rate * 100:.1f}%\n"
                f"- Items in Itinerary:\n" + "\n".join(f"  * {it}" for it in items_list) + "\n\n"
                "Calculate a probability score between 0.0 and 100.0 indicating the likelihood of approval.\n"
                "Return a JSON object with this exact key:\n"
                "- 'approval_probability' (float between 0.0 and 100.0)\n"
            )

            gemini_res = self._call_gemini(prompt)
            if gemini_res and isinstance(gemini_res, dict) and 'approval_probability' in gemini_res:
                return round(float(gemini_res['approval_probability']), 2)

        # Local regression fallback
        if not self.approval_model or not self.approval_scaler:
            return 80.0
            
        # budget_tier_code (0=BUDGET, 1=STANDARD, 2=LUXURY)
        tier_map = {'BUDGET': 0, 'STANDARD': 1, 'LUXURY': 2, 'CUSTOM': 1}
        budget_tier_code = tier_map.get(tour.budget_tier, 1)
        
        has_flight = 1 if tour.items.filter(flight__isnull=False).exists() else 0
        has_hotel = 1 if tour.items.filter(hotel__isnull=False).exists() else 0
        has_restaurant = 1 if tour.items.filter(restaurant__isnull=False).exists() else 0
        has_ride = 1 if tour.items.filter(ride__isnull=False).exists() else 0
        
        # Build input array
        features = [[
            total_cost,
            budget_tier_code,
            has_flight,
            has_hotel,
            has_restaurant,
            has_ride,
            user_approval_rate
        ]]
        
        # Predict probability
        features_scaled = self.approval_scaler.transform(features)
        prob = self.approval_model.predict_proba(features_scaled)[0][1]
        return round(float(prob * 100), 2)

    def predict_future_cost(self, tour):
        """
        Predicts future price for this tour structure using Gemini API,
        falling back to local Linear Regression cost model.
        """
        base_cost = float(tour.base_cost)
        days_ahead = (tour.start_date - date.today()).days if tour.start_date else 0
        if days_ahead < 0:
            days_ahead = 0

        # Try Gemini API
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if api_key:
            prompt = (
                "You are an AI financial pricing engine predicting pricing inflation or seasonal change.\n"
                f"- Base Cost of Tour: ${base_cost}\n"
                f"- Days until departure: {days_ahead}\n"
                f"- Start Month: {tour.start_date.month if tour.start_date else 1}\n"
                f"- Budget Tier: {tour.budget_tier}\n\n"
                "Estimate the forecasted final price of this tour factoring in summer/winter peaks, inflation, and booking lead time.\n"
                "Return a JSON object with this exact key:\n"
                "- 'future_cost_prediction' (float)\n"
            )

            gemini_res = self._call_gemini(prompt)
            if gemini_res and isinstance(gemini_res, dict) and 'future_cost_prediction' in gemini_res:
                return round(float(gemini_res['future_cost_prediction']), 2)

        # Local regression fallback
        if not self.cost_model or not self.cost_scaler:
            return float(tour.base_cost * Decimal('1.05'))
            
        month = tour.start_date.month if tour.start_date else 1
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
