from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'submit']:
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
        hotel_item = tour.items.filter(hotel__isnull=False).first()
        flight_item = tour.items.filter(flight__isnull=False).first()
        ride_item = tour.items.filter(ride__isnull=False).first()

        if hotel_item and hotel_item.hotel:
            destination = hotel_item.hotel.location
        elif flight_item and flight_item.flight:
            destination = flight_item.flight.destination_city
        elif ride_item and ride_item.ride:
            destination = ride_item.ride.location
        elif tour.package:
            destination = tour.package.destination
        elif "to " in tour.title.lower():
            destination = tour.title.lower().split("to ", 1)[1].split("—")[0].split("-")[0].strip().title()
            
        if not destination:
            destination = "Cox's Bazar"
            
        prob = engine.predict_approval_probability(tour)
        fut_cost = engine.predict_future_cost(tour)
        alts = engine.get_cheaper_alternatives(tour)
        weather = engine.get_weather_recommendations(destination)
        
        return Response({
            "tour_id": tour.id,
            "approval_probability": prob,
            "future_cost_prediction": fut_cost,
            "cheaper_alternatives": alts,
            "weather_recommendations": weather,
            "ai_itinerary": tour.ai_itinerary
        }, status=status.HTTP_200_OK)


from rest_framework.decorators import api_view, permission_classes
from openai import OpenAI
import json
import os
from django.conf import settings

# Initialize Groq client using the OpenAI SDK format
def get_groq_client():
    api_key = getattr(settings, 'GROQ_API_KEY', '') or os.environ.get("GROQ_API_KEY", "")
    return OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key
    )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_itinerary(request):
    destination = request.data.get('destination')
    days = request.data.get('days', 3)
    interests = request.data.get('interests', 'general')

    if not destination:
        return Response({"error": "Destination is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Force the model to think in structured JSON matching the frontend layout
    system_prompt = (
        "You are an expert travel planner. You must respond ONLY with a valid JSON object. "
        "Do not include introductory or concluding text. The JSON structure must strictly be:\n"
        "{\n"
        "  \"destination\": \"City Name\",\n"
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

    user_prompt = f"Create a {days}-day itinerary for {destination} focusing on {interests}."

    client = get_groq_client()
    preferred_model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
    models_to_try = [preferred_model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]

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
            return Response(ai_data, status=status.HTTP_200_OK)
        except Exception as e:
            last_error = e
            continue

    return Response({"error": str(last_error)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
