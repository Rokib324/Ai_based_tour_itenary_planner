from django.db import models
from django.conf import settings

class BudgetTier(models.TextChoices):
    BUDGET = 'BUDGET', 'Budget'
    STANDARD = 'STANDARD', 'Standard'
    LUXURY = 'LUXURY', 'Luxury'
    CUSTOM = 'CUSTOM', 'Custom'


# Service Provider inventories
class FlightService(models.Model):
    name = models.CharField(max_length=100)
    flight_number = models.CharField(max_length=20, unique=True)
    departure_city = models.CharField(max_length=100)
    destination_city = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'FLIGHT_MANAGER'},
        related_name='managed_flights'
    )
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.flight_number}) - ${self.price}"


class HotelService(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    room_type = models.CharField(max_length=50)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'HOTEL_MANAGER'},
        related_name='managed_hotels'
    )
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} in {self.location} - ${self.price_per_night}/night"


class RestaurantService(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    cuisine = models.CharField(max_length=50)
    price_per_meal = models.DecimalField(max_digits=10, decimal_places=2)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'RESTAURANT_MANAGER'},
        related_name='managed_restaurants'
    )
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.cuisine}) - ${self.price_per_meal}/meal"


class RideService(models.Model):
    vehicle_type = models.CharField(max_length=50)  # e.g., Sedan, SUV, Bus
    provider_name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    price_per_km = models.DecimalField(max_digits=10, decimal_places=2)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'RIDE_MANAGER'},
        related_name='managed_rides'
    )
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vehicle_type} by {self.provider_name} - ${self.price_per_km}/km"


# Pre-defined Tour Packages created by Admins
class TourPackage(models.Model):
    title = models.CharField(max_length=150)
    description = models.TextField()
    destination = models.CharField(max_length=100)
    budget_tier = models.CharField(max_length=20, choices=BudgetTier.choices, default=BudgetTier.STANDARD)
    duration_days = models.IntegerField(default=1)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    cover_image = models.ImageField(upload_to='packages/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - ${self.base_price}"


# Actual planned Tour instances
class Tour(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        LOCKED = 'LOCKED', 'Locked (Awaiting Payment)'
        UNLOCKED = 'UNLOCKED', 'Unlocked (Paid)'
        COMPLETED = 'COMPLETED', 'Completed'

    traveler = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tours'
    )
    package = models.ForeignKey(
        TourPackage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customized_tours'
    )
    title = models.CharField(max_length=150)
    budget_tier = models.CharField(max_length=20, choices=BudgetTier.choices, default=BudgetTier.STANDARD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Financial fields
    base_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=25.00)
    final_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_prices(self):
        """
        Dynamically calculate and save base_cost and final_price based on markup requirements:
        Budget: 18%, Standard: 25%, Luxury: 32%, Custom: 35%
        """
        # Determine markup percentage based on tier
        if self.package is not None and not self.items.exists():
            # If it's a direct package booking with no modifications
            self.base_cost = self.package.base_price
        else:
            # Aggregate items
            flight_sum = sum(item.flight.price for item in self.items.all() if item.flight)
            hotel_sum = sum(item.hotel.price_per_night * item.quantity for item in self.items.all() if item.hotel)
            restaurant_sum = sum(item.restaurant.price_per_meal * item.quantity for item in self.items.all() if item.restaurant)
            ride_sum = sum(item.ride.price_per_km * item.quantity for item in self.items.all() if item.ride)
            self.base_cost = flight_sum + hotel_sum + restaurant_sum + ride_sum

        from decimal import Decimal
        if self.budget_tier == BudgetTier.BUDGET:
            self.markup_percentage = Decimal('18.00')
        elif self.budget_tier == BudgetTier.STANDARD:
            self.markup_percentage = Decimal('25.00')
        elif self.budget_tier == BudgetTier.LUXURY:
            self.markup_percentage = Decimal('32.00')
        else:
            self.markup_percentage = Decimal('35.00')

        self.final_price = self.base_cost * (Decimal('1') + self.markup_percentage / Decimal('100'))

    def save(self, *args, **kwargs):
        # Initial save to establish pk if calculating with items relationship
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} by {self.traveler.email} ({self.status})"


# Items inside a tour
class TourItem(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='items')
    flight = models.ForeignKey(FlightService, on_delete=models.SET_NULL, null=True, blank=True)
    hotel = models.ForeignKey(HotelService, on_delete=models.SET_NULL, null=True, blank=True)
    restaurant = models.ForeignKey(RestaurantService, on_delete=models.SET_NULL, null=True, blank=True)
    ride = models.ForeignKey(RideService, on_delete=models.SET_NULL, null=True, blank=True)
    
    quantity = models.IntegerField(default=1)  # represents nights for hotels, meals for restaurant, km for rides
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        item_type = "Empty Item"
        if self.flight:
            item_type = f"Flight: {self.flight.flight_number}"
        elif self.hotel:
            item_type = f"Hotel: {self.hotel.name}"
        elif self.restaurant:
            item_type = f"Restaurant: {self.restaurant.name}"
        elif self.ride:
            item_type = f"Ride: {self.ride.vehicle_type}"
        return f"Item {self.id} for Tour {self.tour.id} - {item_type}"


# Signal to create approval workflow automatically
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Tour)
def create_tour_approval_workflow(sender, instance, created, **kwargs):
    if created:
        from approvals.models import TourApproval
        TourApproval.objects.get_or_create(tour=instance)

