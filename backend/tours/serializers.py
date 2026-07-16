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
            'base_cost', 'markup_percentage', 'final_price', 'items', 'new_items',
            'created_at', 'updated_at'
        )
        read_only_fields = ('traveler', 'base_cost', 'markup_percentage', 'final_price', 'status')

    def create(self, validated_data):
        new_items_data = validated_data.pop('new_items', [])
        package = validated_data.get('package', None)
        
        # Set current user as traveler
        request = self.context.get('request')
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
        return tour

    def update(self, instance, validated_data):
        # We only allow updating pending tours
        if instance.status != Tour.Status.PENDING:
            raise serializers.ValidationError("Only tours in PENDING status can be updated.")
            
        new_items_data = validated_data.pop('new_items', None)
        
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
