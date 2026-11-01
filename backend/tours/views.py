from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db import models
from django.conf import settings
import json
import os
import random
from openai import OpenAI
from users.models import User
from users.permissions import (
    IsAdminOrSuperAdmin,
    IsTraveler,
    IsFlightManager,
    IsHotelManager,
    IsRestaurantManager,
    IsRideManager
)
from tours.models import (
    FlightService,
    HotelService,
    RestaurantService,
    RideService,
    TourPackage,
    Tour,
    TourItem
)
from tours.serializers import (
    FlightServiceSerializer,
    HotelServiceSerializer,
    RestaurantServiceSerializer,
    RideServiceSerializer,
    TourPackageSerializer,
    TourSerializer
)
from tours.ai_engine import AIEngine


# Initialize Groq client using the OpenAI SDK format
def get_groq_client():
    api_key = getattr(settings, 'GROQ_API_KEY', '') or os.environ.get("GROQ_API_KEY", "")
    return OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key
    )


def generate_services_for_destination(destination, budget_tier='STANDARD', departure_city='Dhaka'):
    """
    Uses Groq Cloud AI to generate authentic, place-specific flights, hotels, rides,
    and restaurants for the target destination, and persists them into the database catalog.
    """
    dest_clean = (destination or '').strip()
    if not dest_clean:
        return {"flights": [], "hotels": [], "rides": [], "restaurants": []}

    tier_clean = budget_tier.upper() if budget_tier else 'STANDARD'
    dep_city = (departure_city or 'Dhaka').strip()

    flight_mgr = User.objects.filter(role=User.Roles.FLIGHT_MANAGER).first()
    hotel_mgr = User.objects.filter(role=User.Roles.HOTEL_MANAGER).first()
    rest_mgr = User.objects.filter(role=User.Roles.RESTAURANT_MANAGER).first()
    ride_mgr = User.objects.filter(role=User.Roles.RIDE_MANAGER).first()

    client = get_groq_client()
    preferred_model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
    models_to_try = [preferred_model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]

    system_prompt = (
        "You are an expert global travel and tour logistics specialist. "
        "You must respond ONLY with a valid JSON object. "
        "Do not include any conversational or markdown text outside the JSON. "
        "The JSON structure must strictly follow:\n"
        "{\n"
        f"  \"destination\": \"{dest_clean}\",\n"
        "  \"flights\": [\n"
        f"    {{\"name\": \"Airline Name\", \"flight_number\": \"AirlineCode-101\", \"departure_city\": \"{dep_city}\", \"destination_city\": \"{dest_clean}\", \"price\": 450.00}}\n"
        "  ],\n"
        "  \"hotels\": [\n"
        f"    {{\"name\": \"Hotel Name\", \"location\": \"{dest_clean}\", \"room_type\": \"Deluxe Room\", \"price_per_night\": 180.00}}\n"
        "  ],\n"
        "  \"rides\": [\n"
        f"    {{\"vehicle_type\": \"Private Sedan / Taxi\", \"provider_name\": \"Local Ride Provider\", \"location\": \"{dest_clean}\", \"price_per_km\": 2.50}}\n"
        "  ],\n"
        "  \"restaurants\": [\n"
        f"    {{\"name\": \"Restaurant Name\", \"location\": \"{dest_clean}\", \"cuisine\": \"Local Cuisine\", \"price_per_meal\": 35.00}}\n"
        "  ]\n"
        "}\n"
        "Guidelines:\n"
        "- Generate exactly 3 to 4 realistic, authentic items for EACH category (flights, hotels, rides, restaurants).\n"
        "- All hotels, rides, and restaurants MUST be located in or around the target destination.\n"
        "- Flights must connect departure_city to destination_city.\n"
        "- Prices must be realistic positive numbers matching the budget tier (e.g. BUDGET, STANDARD, or LUXURY)."
    )

    user_prompt = f"Generate 3-4 realistic travel services (flights, hotels, transport/rides, and restaurants) for traveling to {dest_clean} with budget tier {tier_clean}."

    ai_data = None
    for model_name in models_to_try:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            parsed = json.loads(response.choices[0].message.content)
            if parsed and isinstance(parsed, dict) and ('hotels' in parsed or 'flights' in parsed):
                ai_data = parsed
                break
        except Exception:
            continue

    # Fallback template if network/AI is completely unreachable
    if not ai_data or not isinstance(ai_data, dict):
        ai_data = {
            "destination": dest_clean,
            "flights": [
                {"name": f"{dest_clean} Express Airways", "flight_number": f"{dest_clean[:2].upper()}-710", "departure_city": dep_city, "destination_city": dest_clean, "price": 380.00},
                {"name": "Global Wings International", "flight_number": f"GW-{random.randint(100, 999)}", "departure_city": dep_city, "destination_city": dest_clean, "price": 460.00},
                {"name": "SkyConnect Airlines", "flight_number": f"SC-{random.randint(100, 999)}", "departure_city": dep_city, "destination_city": dest_clean, "price": 320.00},
            ],
            "hotels": [
                {"name": f"Grand {dest_clean} Hotel & Suites", "location": dest_clean, "room_type": "Deluxe Room", "price_per_night": 160.00},
                {"name": f"{dest_clean} Heritage Boutique Stay", "location": dest_clean, "room_type": "Executive Suite", "price_per_night": 220.00},
                {"name": f"Comfort Inn {dest_clean} City Center", "location": dest_clean, "room_type": "Standard Queen", "price_per_night": 95.00},
            ],
            "rides": [
                {"vehicle_type": "Private Sedan", "provider_name": f"{dest_clean} City Rides", "location": dest_clean, "price_per_km": 2.20},
                {"vehicle_type": "Premium Airport SUV", "provider_name": f"{dest_clean} Executive Chauffeur", "location": dest_clean, "price_per_km": 3.80},
                {"vehicle_type": "City Tour Van / Cab", "provider_name": f"{dest_clean} Express Transport", "location": dest_clean, "price_per_km": 1.90},
            ],
            "restaurants": [
                {"name": f"The {dest_clean} Culinary Kitchen", "location": dest_clean, "cuisine": f"Authentic {dest_clean} Specialties", "price_per_meal": 35.00},
                {"name": f"{dest_clean} Street Food & Grill House", "location": dest_clean, "cuisine": "Local Street Flavors & BBQ", "price_per_meal": 18.00},
                {"name": f"Le Panoramique {dest_clean}", "location": dest_clean, "cuisine": "Fine Dining & Seafood", "price_per_meal": 65.00},
            ]
        }

    # Persist Flights
    for f in ai_data.get('flights', []):
        try:
            name = str(f.get('name', 'Airline'))[:100]
            raw_fn = str(f.get('flight_number', f"FL-{random.randint(100, 999)}"))[:20]
            fn = raw_fn
            counter = 1
            while FlightService.objects.filter(flight_number=fn).exists():
                fn = f"{raw_fn[:15]}-{random.randint(10, 99)}"[:20]
                counter += 1
                if counter > 10:
                    break
            flight_dep = str(f.get('departure_city', dep_city))[:100]
            flight_dest = str(f.get('destination_city', dest_clean))[:100]
            price = max(10.0, float(f.get('price', 350.0)))

            existing = FlightService.objects.filter(name=name, destination_city__iexact=flight_dest, departure_city__iexact=flight_dep).first()
            if not existing:
                FlightService.objects.create(
                    name=name,
                    flight_number=fn,
                    departure_city=flight_dep,
                    destination_city=flight_dest,
                    price=price,
                    manager=flight_mgr,
                    is_available=True
                )
        except Exception:
            continue

    # Persist Hotels
    for h in ai_data.get('hotels', []):
        try:
            name = str(h.get('name', 'Hotel'))[:100]
            loc = str(h.get('location', dest_clean))[:100]
            room_type = str(h.get('room_type', 'Deluxe Room'))[:50]
            price = max(15.0, float(h.get('price_per_night', 120.0)))
            HotelService.objects.get_or_create(
                name=name,
                location=loc,
                defaults={
                    'room_type': room_type,
                    'price_per_night': price,
                    'manager': hotel_mgr,
                    'is_available': True
                }
            )
        except Exception:
            continue

    # Persist Rides
    for rd in ai_data.get('rides', []):
        try:
            vt = str(rd.get('vehicle_type', 'Sedan'))[:50]
            prov = str(rd.get('provider_name', 'Local Rides'))[:100]
            loc = str(rd.get('location', dest_clean))[:100]
            price = max(0.5, float(rd.get('price_per_km', 2.0)))
            RideService.objects.get_or_create(
                vehicle_type=vt,
                provider_name=prov,
                location=loc,
                defaults={
                    'price_per_km': price,
                    'manager': ride_mgr,
                    'is_available': True
                }
            )
        except Exception:
            continue

    # Persist Restaurants
    for r in ai_data.get('restaurants', []):
        try:
            name = str(r.get('name', 'Restaurant'))[:100]
            loc = str(r.get('location', dest_clean))[:100]
            cuisine = str(r.get('cuisine', 'Local Cuisine'))[:50]
            price = max(5.0, float(r.get('price_per_meal', 25.0)))
            RestaurantService.objects.get_or_create(
                name=name,
                location=loc,
                defaults={
                    'cuisine': cuisine,
                    'price_per_meal': price,
                    'manager': rest_mgr,
                    'is_available': True
                }
            )
        except Exception:
            continue

    # Fetch all available services matching the destination
    dest_flights = list(FlightService.objects.filter(
        models.Q(destination_city__icontains=dest_clean) | models.Q(departure_city__icontains=dest_clean),
        is_available=True
    ))
    dest_hotels = list(HotelService.objects.filter(location__icontains=dest_clean, is_available=True))
    dest_rides = list(RideService.objects.filter(location__icontains=dest_clean, is_available=True))
    dest_restaurants = list(RestaurantService.objects.filter(location__icontains=dest_clean, is_available=True))

    return {
        "destination": dest_clean,
        "flights": FlightServiceSerializer(dest_flights, many=True).data,
        "hotels": HotelServiceSerializer(dest_hotels, many=True).data,
        "rides": RideServiceSerializer(dest_rides, many=True).data,
        "restaurants": RestaurantServiceSerializer(dest_restaurants, many=True).data,
    }


class FlightServiceViewSet(viewsets.ModelViewSet):
    queryset = FlightService.objects.all()
    serializer_class = FlightServiceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsFlightManager | IsAdminOrSuperAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(manager=self.request.user)

    def get_queryset(self):
        queryset = FlightService.objects.all()
        is_available = self.request.query_params.get('available')
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
        destination = self.request.query_params.get('destination')
        if destination:
            dest = destination.strip()
            dest_qs = queryset.filter(
                models.Q(destination_city__icontains=dest) | models.Q(departure_city__icontains=dest)
            )
            if not dest_qs.exists():
                generate_services_for_destination(dest)
                dest_qs = FlightService.objects.filter(
                    models.Q(destination_city__icontains=dest) | models.Q(departure_city__icontains=dest)
                )
            return dest_qs
        return queryset


class HotelServiceViewSet(viewsets.ModelViewSet):
    queryset = HotelService.objects.all()
    serializer_class = HotelServiceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsHotelManager | IsAdminOrSuperAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(manager=self.request.user)

    def get_queryset(self):
        queryset = HotelService.objects.all()
        is_available = self.request.query_params.get('available')
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
        destination = self.request.query_params.get('destination')
        if destination:
            dest = destination.strip()
            dest_qs = queryset.filter(location__icontains=dest)
            if not dest_qs.exists():
                generate_services_for_destination(dest)
                dest_qs = HotelService.objects.filter(location__icontains=dest)
            return dest_qs
        return queryset


class RestaurantServiceViewSet(viewsets.ModelViewSet):
    queryset = RestaurantService.objects.all()
    serializer_class = RestaurantServiceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsRestaurantManager | IsAdminOrSuperAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(manager=self.request.user)

    def get_queryset(self):
        queryset = RestaurantService.objects.all()
        is_available = self.request.query_params.get('available')
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
        destination = self.request.query_params.get('destination')
        if destination:
            dest = destination.strip()
            dest_qs = queryset.filter(location__icontains=dest)
            if not dest_qs.exists():
                generate_services_for_destination(dest)
                dest_qs = RestaurantService.objects.filter(location__icontains=dest)
            return dest_qs
        return queryset


class RideServiceViewSet(viewsets.ModelViewSet):
    queryset = RideService.objects.all()
    serializer_class = RideServiceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsRideManager | IsAdminOrSuperAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(manager=self.request.user)

    def get_queryset(self):
        queryset = RideService.objects.all()
        is_available = self.request.query_params.get('available')
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
        destination = self.request.query_params.get('destination')
        if destination:
            dest = destination.strip()
            dest_qs = queryset.filter(location__icontains=dest)
            if not dest_qs.exists():
                generate_services_for_destination(dest)
                dest_qs = RideService.objects.filter(location__icontains=dest)
            return dest_qs
        return queryset


class TourPackageViewSet(viewsets.ModelViewSet):
    queryset = TourPackage.objects.filter(is_active=True)
    serializer_class = TourPackageSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsAdminOrSuperAdmin]
        return [permission() for permission in permission_classes]


class TourViewSet(viewsets.ModelViewSet):
    serializer_class = TourSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'submit', 'resolve_service']:
            permission_classes = [IsTraveler | IsAdminOrSuperAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['ADMIN', 'SUPER_ADMIN']:
            return Tour.objects.all()
        if user.role == 'TRAVELER':
            return Tour.objects.filter(traveler=user)
        if user.role == 'FLIGHT_MANAGER':
            return Tour.objects.filter(items__flight__isnull=False).distinct()
        elif user.role == 'HOTEL_MANAGER':
            return Tour.objects.filter(items__hotel__isnull=False).distinct()
        elif user.role == 'RESTAURANT_MANAGER':
            return Tour.objects.filter(items__restaurant__isnull=False).distinct()
        elif user.role == 'RIDE_MANAGER':
            return Tour.objects.filter(items__ride__isnull=False).distinct()
        return Tour.objects.none()

    @action(detail=True, methods=['post'], url_path='resolve-service')
    def resolve_service(self, request, pk=None):
        tour = self.get_object()
        if tour.traveler != request.user and request.user.role not in ['ADMIN', 'SUPER_ADMIN']:
            return Response({"detail": "You do not have permission to modify this tour."}, status=status.HTTP_403_FORBIDDEN)

        service_type = request.data.get('service_type', '').strip().lower()
        action_type = request.data.get('action_type', '').strip().lower()  # 'catalog', 'custom', 'skip'
        catalog_id = request.data.get('catalog_id')
        custom_name = request.data.get('custom_provider_name', '').strip()
        custom_details = request.data.get('custom_details', '').strip()
        custom_cost = request.data.get('custom_cost', 0.0)

        if service_type not in ['flight', 'hotel', 'restaurant', 'ride']:
            return Response({"error": "Invalid service_type. Must be flight, hotel, restaurant, or ride."}, status=status.HTTP_400_BAD_REQUEST)

        if action_type not in ['catalog', 'custom', 'skip']:
            return Response({"error": "Invalid action_type. Must be catalog, custom, or skip."}, status=status.HTTP_400_BAD_REQUEST)

        from approvals.models import TourApproval, ApprovalStatus
        approval, _ = TourApproval.objects.get_or_create(tour=tour)

        # Find existing item matching service_type
        item = None
        for it in tour.items.all():
            if getattr(it, service_type, None) is not None or (it.is_custom_provided and (it.custom_service_type or '').lower() == service_type):
                item = it
                break

        if action_type == 'skip':
            if item:
                item.delete()
            setattr(approval, f"{service_type}_status", ApprovalStatus.SKIPPED)
        elif action_type == 'catalog':
            if not catalog_id:
                return Response({"error": "catalog_id is required for catalog replacement."}, status=status.HTTP_400_BAD_REQUEST)
            if not item:
                item = TourItem(tour=tour)
            item.is_custom_provided = False
            item.custom_provider_name = None
            item.custom_details = None
            item.custom_cost = 0.00
            item.flight = None
            item.hotel = None
            item.restaurant = None
            item.ride = None

            if service_type == 'flight':
                try:
                    item.flight = FlightService.objects.get(id=catalog_id)
                except FlightService.DoesNotExist:
                    return Response({"error": "Selected flight not found."}, status=status.HTTP_404_NOT_FOUND)
            elif service_type == 'hotel':
                try:
                    item.hotel = HotelService.objects.get(id=catalog_id)
                except HotelService.DoesNotExist:
                    return Response({"error": "Selected hotel not found."}, status=status.HTTP_404_NOT_FOUND)
            elif service_type == 'restaurant':
                try:
                    item.restaurant = RestaurantService.objects.get(id=catalog_id)
                except RestaurantService.DoesNotExist:
                    return Response({"error": "Selected restaurant not found."}, status=status.HTTP_404_NOT_FOUND)
            elif service_type == 'ride':
                try:
                    item.ride = RideService.objects.get(id=catalog_id)
                except RideService.DoesNotExist:
                    return Response({"error": "Selected ride not found."}, status=status.HTTP_404_NOT_FOUND)
            item.save()
            setattr(approval, f"{service_type}_status", ApprovalStatus.APPROVED)
        elif action_type == 'custom':
            if not item:
                item = TourItem(tour=tour)
            item.flight = None
            item.hotel = None
            item.restaurant = None
            item.ride = None
            item.is_custom_provided = True
            item.custom_service_type = service_type.upper()
            item.custom_provider_name = custom_name or f"Custom {service_type.capitalize()} Provider"
            item.custom_details = custom_details
            from decimal import Decimal
            try:
                item.custom_cost = Decimal(str(custom_cost or 0.00))
            except Exception:
                item.custom_cost = Decimal('0.00')
            item.save()
            setattr(approval, f"{service_type}_status", ApprovalStatus.APPROVED)

        # Recalculate financial breakdown
        tour.calculate_prices()
        tour.save()

        # Update approval workflow and trigger decision engine
        approval.save()
        approval.run_decision_engine()

        from notifications.utils import notify_user
        notify_user(
            user=tour.traveler,
            title="Service Replacement Confirmed",
            subject=f"Custom {service_type.capitalize()} Updated",
            message=f"You have successfully configured a {action_type} option for {service_type.capitalize()} on '{tour.title}'."
        )

        return Response({
            "message": f"Successfully resolved {service_type} via {action_type}.",
            "tour": TourSerializer(tour).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        tour = self.get_object()
        if tour.traveler != request.user and request.user.role not in ['ADMIN', 'SUPER_ADMIN']:
            return Response({"detail": "You do not have permission to submit this tour."}, status=status.HTTP_403_FORBIDDEN)
        if tour.status != Tour.Status.PENDING:
            return Response({"detail": f"Cannot submit a tour with status: {tour.status}"}, status=status.HTTP_400_BAD_REQUEST)
        
        tour.calculate_prices()
        tour.save()
        
        from approvals.models import TourApproval, ApprovalStatus
        approval, created = TourApproval.objects.get_or_create(tour=tour)
        
        has_flight = tour.items.filter(flight__isnull=False).exists()
        has_hotel = tour.items.filter(hotel__isnull=False).exists()
        has_restaurant = tour.items.filter(restaurant__isnull=False).exists()
        has_ride = tour.items.filter(ride__isnull=False).exists()
        
        approval.flight_status = ApprovalStatus.PENDING if has_flight else ApprovalStatus.SKIPPED
        approval.hotel_status = ApprovalStatus.PENDING if has_hotel else ApprovalStatus.SKIPPED
        approval.restaurant_status = ApprovalStatus.PENDING if has_restaurant else ApprovalStatus.SKIPPED
        approval.ride_status = ApprovalStatus.PENDING if has_ride else ApprovalStatus.SKIPPED
        
        approval.admin_status = ApprovalStatus.PENDING
        approval.decision_engine_status = ApprovalStatus.PENDING
        approval.save()
        
        tour.status = Tour.Status.PENDING
        tour.save()
        
        return Response({
            "message": "Tour submitted successfully to the approval workflow.",
            "tour": TourSerializer(tour).data,
            "approval_workflow_id": approval.id
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='ai-analysis')
    def ai_analysis(self, request, pk=None):
        tour = self.get_object()
        engine = AIEngine()
        
        # Determine destination intelligently from hotel, flight, ride, package, or tour title
        destination = ""
        if tour.package and tour.package.destination:
            destination = tour.package.destination
        
        if not destination:
            hotel_item = tour.items.filter(hotel__isnull=False).first()
            flight_item = tour.items.filter(flight__isnull=False).first()
            ride_item = tour.items.filter(ride__isnull=False).first()

            if hotel_item and hotel_item.hotel and hotel_item.hotel.location:
                destination = hotel_item.hotel.location
            elif flight_item and flight_item.flight and flight_item.flight.destination_city:
                destination = flight_item.flight.destination_city
            elif ride_item and ride_item.ride and ride_item.ride.location:
                destination = ride_item.ride.location

        if not destination:
            t_title = tour.title.lower()
            if "to " in t_title:
                destination = tour.title.split("to ", 1)[1].split("—")[0].split("-")[0].strip().title()
            elif "in " in t_title:
                destination = tour.title.split("in ", 1)[1].split("—")[0].split("-")[0].strip().title()
            
        if not destination:
            destination = "Cox's Bazar"
            
        prob = engine.predict_approval_probability(tour)
        fut_cost = engine.predict_future_cost(tour)
        alts = engine.get_cheaper_alternatives(tour)
        weather = engine.get_weather_recommendations(destination, start_date=tour.start_date)
        
        return Response({
            "tour_id": tour.id,
            "approval_probability": prob,
            "future_cost_prediction": fut_cost,
            "cheaper_alternatives": alts,
            "weather_recommendations": weather,
            "ai_itinerary": tour.ai_itinerary
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_itinerary(request):
    destination = request.data.get('destination')
    days = request.data.get('days', 3)
    interests = request.data.get('interests', 'general')
    budget_tier = request.data.get('budget_tier', 'STANDARD')

    if not destination:
        return Response({"error": "Destination is required."}, status=status.HTTP_400_BAD_REQUEST)

    dest_clean = destination.strip()

    # Force the model to think in structured JSON matching the frontend layout
    system_prompt = (
        "You are an expert travel planner. You must respond ONLY with a valid JSON object. "
        "Do not include introductory or concluding text. The JSON structure must strictly be:\n"
        "{\n"
        f"  \"destination\": \"{dest_clean}\",\n"
        "  \"itinerary\": [\n"
        "    {\n"
        "      \"day\": 1,\n"
        "      \"activities\": [\n"
        "        {\"time\": \"Morning\", \"title\": \"...\", \"description\": \"...\", \"location\": \"...\"}\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = f"Create a {days}-day itinerary for {dest_clean} focusing on {interests}."

    client = get_groq_client()
    preferred_model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
    models_to_try = [preferred_model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]

    ai_data = None
    last_error = None
    for model_name in models_to_try:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            ai_data = json.loads(response.choices[0].message.content)
            if ai_data and isinstance(ai_data, dict):
                break
        except Exception as e:
            last_error = e
            continue

    if not ai_data or not isinstance(ai_data, dict):
        return Response({"error": str(last_error or "Failed to generate itinerary.")}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Concurrently generate/ensure services for this destination
    try:
        services_data = generate_services_for_destination(dest_clean, budget_tier=budget_tier)
        ai_data['services'] = services_data
    except Exception:
        pass

    return Response(ai_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_services(request):
    destination = request.data.get('destination')
    budget_tier = request.data.get('budget_tier', 'STANDARD')
    departure_city = request.data.get('departure_city', 'Dhaka')

    if not destination:
        return Response({"error": "Destination is required."}, status=status.HTTP_400_BAD_REQUEST)

    services_data = generate_services_for_destination(
        destination=destination.strip(),
        budget_tier=budget_tier,
        departure_city=departure_city
    )
    return Response(services_data, status=status.HTTP_200_OK)
