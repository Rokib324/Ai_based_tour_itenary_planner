from rest_framework import serializers
from django.contrib.auth import get_user_model
from tours.models import (
    FlightService,
    HotelService,
    RestaurantService,
    RideService,
    TourPackage,
    Tour,
    TourItem
)

User = get_user_model()

# Inventory Serializers
class FlightServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightService
        fields = '__all__'
        read_only_fields = ('manager',)


class HotelServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelService
        fields = '__all__'
        read_only_fields = ('manager',)


class RestaurantServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantService
        fields = '__all__'
        read_only_fields = ('manager',)


class RideServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RideService
        fields = '__all__'
        read_only_fields = ('manager',)


# Package Serializer
class TourPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourPackage
        fields = '__all__'


# Tour Item Serializers
class TourItemSerializer(serializers.ModelSerializer):
    flight_details = FlightServiceSerializer(source='flight', read_only=True)
    hotel_details = HotelServiceSerializer(source='hotel', read_only=True)
    restaurant_details = RestaurantServiceSerializer(source='restaurant', read_only=True)
    ride_details = RideServiceSerializer(source='ride', read_only=True)

    class Meta:
        model = TourItem
        fields = (
            'id', 'flight', 'hotel', 'restaurant', 'ride', 
            'quantity', 'flight_details', 'hotel_details', 
            'restaurant_details', 'ride_details'
        )


class TourItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourItem
        fields = ('flight', 'hotel', 'restaurant', 'ride', 'quantity')


# Main Tour Serializer
class TourSerializer(serializers.ModelSerializer):
    items = TourItemSerializer(many=True, read_only=True)
    new_items = serializers.ListField(
        child=TourItemCreateSerializer(), 
        write_only=True, 
        required=False
    )
    traveler_email = serializers.EmailField(source='traveler.email', read_only=True)
    package_details = TourPackageSerializer(source='package', read_only=True)

    class Meta:
        model = Tour
        fields = (
            'id', 'traveler', 'traveler_email', 'package', 'package_details',
            'title', 'budget_tier', 'status', 'start_date', 'end_date',
            'base_cost', 'markup_percentage', 'final_price', 'ai_itinerary',
            'items', 'new_items', 'created_at', 'updated_at'
        )
        read_only_fields = ('traveler', 'base_cost', 'markup_percentage', 'final_price', 'status')

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        from django.utils import timezone
        today = timezone.localdate()

        # On creation, start_date cannot be in the past
        if self.instance is None:
            if start_date and start_date < today:
                raise serializers.ValidationError({"start_date": "Start date cannot be in the past."})

        # End date cannot be earlier than start date
        effective_start = start_date or (self.instance.start_date if self.instance else None)
        effective_end = end_date or (self.instance.end_date if self.instance else None)

        if effective_start and effective_end and effective_end < effective_start:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})

        return attrs

    def create(self, validated_data):
        new_items_data = validated_data.pop('new_items', None)
        if new_items_data is None:
            # Fallback to checking initial_data 'items' if passed by frontend
            raw_items = self.initial_data.get('items', [])
            item_serializer = TourItemCreateSerializer(data=raw_items, many=True)
            if item_serializer.is_valid():
                new_items_data = item_serializer.validated_data
            else:
                new_items_data = []

        package = validated_data.get('package', None)
        
        # Set current user as traveler
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['traveler'] = request.user
        
        if package:
            # If using package, budget tier is copied from package
            validated_data['budget_tier'] = package.budget_tier
            
        tour = Tour.objects.create(**validated_data)
        
        # Create custom items if custom tour
        for item_data in new_items_data:
            TourItem.objects.create(tour=tour, **item_data)
            
        # Calculate dynamic cost and final price
        tour.calculate_prices()
        tour.save()

        # Initialize approval workflow checkpoints based on items attached
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

        return tour

    def update(self, instance, validated_data):
        # We only allow updating pending tours
        if instance.status != Tour.Status.PENDING:
            raise serializers.ValidationError("Only tours in PENDING status can be updated.")
            
        new_items_data = validated_data.pop('new_items', None)
        if new_items_data is None and 'items' in self.initial_data:
            raw_items = self.initial_data.get('items', [])
            item_serializer = TourItemCreateSerializer(data=raw_items, many=True)
            if item_serializer.is_valid():
                new_items_data = item_serializer.validated_data

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if new_items_data is not None:
            # Clear old items and recreate
            instance.items.all().delete()
            for item_data in new_items_data:
                TourItem.objects.create(tour=instance, **item_data)
                
        # Recalculate price
        instance.calculate_prices()
        instance.save()
        return instance
