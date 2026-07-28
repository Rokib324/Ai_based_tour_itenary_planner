import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tours.models import FlightService, HotelService, RestaurantService, RideService, TourPackage

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds mock travel catalog services and pre-defined packages for AI recommendations.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding database travel data...")

        # 1. Create or get Service Managers
        managers = {
            'FLIGHT_MANAGER': {
                'email': 'flight_mgr@travel.com',
                'username': 'flight_mgr',
                'role': User.Roles.FLIGHT_MANAGER
            },
            'HOTEL_MANAGER': {
                'email': 'hotel_mgr@travel.com',
                'username': 'hotel_mgr',
                'role': User.Roles.HOTEL_MANAGER
            },
            'RESTAURANT_MANAGER': {
                'email': 'restaurant_mgr@travel.com',
                'username': 'restaurant_mgr',
                'role': User.Roles.RESTAURANT_MANAGER
            },
            'RIDE_MANAGER': {
                'email': 'ride_mgr@travel.com',
                'username': 'ride_mgr',
                'role': User.Roles.RIDE_MANAGER
            },
            'ADMIN': {
                'email': 'admin@travel.com',
                'username': 'admin',
                'role': User.Roles.ADMIN
            }
        }

        manager_users = {}
        for role_name, info in managers.items():
            user = User.objects.filter(email=info['email']).first()
            if not user:
                user = User.objects.filter(username=info['username']).first()
            if not user:
                user = User.objects.create_user(
                    email=info['email'],
                    username=info['username'],
                    password='Password123',
                    role=info['role'],
                    status=User.Status.APPROVED,
                    is_email_verified=True
                )
                self.stdout.write(f"Created manager user: {info['email']}")
            else:
                user.role = info['role']
                user.status = User.Status.APPROVED
                user.is_email_verified = True
                user.save()
            manager_users[role_name] = user

        # 2. Seed Flight Services
        flights_data = [
            {'name': 'Delta Airlines DL-100', 'flight_number': 'DL-100', 'departure_city': 'Dhaka', 'destination_city': 'New York', 'price': 850.00},
            {'name': 'Delta Airlines DL-200', 'flight_number': 'DL-200', 'departure_city': 'London', 'destination_city': 'New York', 'price': 450.00},
            {'name': 'British Airways BA-111', 'flight_number': 'BA-111', 'departure_city': 'New York', 'destination_city': 'London', 'price': 520.00},
            {'name': 'British Airways BA-222', 'flight_number': 'BA-222', 'departure_city': 'Dhaka', 'destination_city': 'London', 'price': 780.00},
            {'name': 'Emirates EK-501', 'flight_number': 'EK-501', 'departure_city': 'New York', 'destination_city': 'Dubai', 'price': 980.00},
            {'name': 'Emirates EK-502', 'flight_number': 'EK-502', 'departure_city': 'London', 'destination_city': 'Dubai', 'price': 380.00},
            {'name': 'Biman Bangladesh BG-047', 'flight_number': 'BG-047', 'departure_city': 'London', 'destination_city': 'Dhaka', 'price': 650.00},
            {'name': 'Biman Bangladesh BG-084', 'flight_number': 'BG-084', 'departure_city': 'Dubai', 'destination_city': 'Dhaka', 'price': 420.00},
        ]

        for item in flights_data:
            flight, created = FlightService.objects.get_or_create(
                flight_number=item['flight_number'],
                defaults={
                    'name': item['name'],
                    'departure_city': item['departure_city'],
                    'destination_city': item['destination_city'],
                    'price': item['price'],
                    'manager': manager_users['FLIGHT_MANAGER'],
                    'is_available': True
                }
            )
            if created:
                self.stdout.write(f"Seeded Flight: {flight.name}")

        # 3. Seed Hotel Services
        hotels_data = [
            {'name': 'The Ritz-Carlton Central Park', 'location': 'New York', 'room_type': 'Deluxe Room', 'price_per_night': 450.00},
            {'name': 'Pod 39 Budget Pods', 'location': 'New York', 'room_type': 'Standard Queen', 'price_per_night': 120.00},
            {'name': 'The Savoy London', 'location': 'London', 'room_type': 'Superior Suite', 'price_per_night': 550.00},
            {'name': 'Generator Hostel London', 'location': 'London', 'room_type': 'Shared Dorm', 'price_per_night': 45.00},
            {'name': 'Burj Al Arab Jumeirah', 'location': 'Dubai', 'room_type': 'Presidential Suite', 'price_per_night': 1200.00},
            {'name': 'Rove Downtown Dubai', 'location': 'Dubai', 'room_type': 'Rover Room', 'price_per_night': 95.00},
            {'name': 'Pan Pacific Sonargaon', 'location': 'Dhaka', 'room_type': 'Executive Suite', 'price_per_night': 180.00},
            {'name': 'Hotel Ornate', 'location': 'Dhaka', 'room_type': 'Standard Single', 'price_per_night': 35.00},
        ]

        for item in hotels_data:
            hotel, created = HotelService.objects.get_or_create(
                name=item['name'],
                location=item['location'],
                defaults={
                    'room_type': item['room_type'],
                    'price_per_night': item['price_per_night'],
                    'manager': manager_users['HOTEL_MANAGER'],
                    'is_available': True
                }
            )
            if created:
                self.stdout.write(f"Seeded Hotel: {hotel.name}")

        # 4. Seed Restaurant Services
        restaurants_data = [
            {'name': 'Eleven Madison Park', 'location': 'New York', 'cuisine': 'Fine Dining', 'price_per_meal': 150.00},
            {'name': 'Joe\'s Pizza Greenwich Village', 'location': 'New York', 'cuisine': 'Pizza / Street Food', 'price_per_meal': 12.00},
            {'name': 'Dinner by Heston Blumenthal', 'location': 'London', 'cuisine': 'Historic British', 'price_per_meal': 95.00},
            {'name': 'Poppies Fish & Chips Soho', 'location': 'London', 'cuisine': 'Traditional British', 'price_per_meal': 18.00},
            {'name': 'Zuma contemporary Japanese', 'location': 'Dubai', 'cuisine': 'Contemporary Japanese', 'price_per_meal': 110.00},
            {'name': 'Al Ustad Special Kabab', 'location': 'Dubai', 'cuisine': 'Traditional Persian / Kabab', 'price_per_meal': 15.00},
            {'name': 'Kasturi Restaurant', 'location': 'Dhaka', 'cuisine': 'Traditional Bengali', 'price_per_meal': 10.00},
            {'name': 'Star Kabab & Restaurant', 'location': 'Dhaka', 'cuisine': 'Kabab / Biryani', 'price_per_meal': 8.00},
        ]

        for item in restaurants_data:
            rest, created = RestaurantService.objects.get_or_create(
                name=item['name'],
                location=item['location'],
                defaults={
                    'cuisine': item['cuisine'],
                    'price_per_meal': item['price_per_meal'],
                    'manager': manager_users['RESTAURANT_MANAGER'],
                    'is_available': True
                }
            )
            if created:
                self.stdout.write(f"Seeded Restaurant: {rest.name}")

        # 5. Seed Ride Services
        rides_data = [
            {'vehicle_type': 'Tesla Model Y Lux', 'provider_name': 'Uber Black NYC', 'location': 'New York', 'price_per_km': 4.50},
            {'vehicle_type': 'Toyota Camry Sedan', 'provider_name': 'Yellow Cab NYC', 'location': 'New York', 'price_per_km': 1.80},
            {'vehicle_type': 'Mercedes E-Class Executive', 'provider_name': 'Black Cab London', 'location': 'London', 'price_per_km': 5.00},
            {'vehicle_type': 'Double-Decker Transit pass', 'provider_name': 'TFL London', 'location': 'London', 'price_per_km': 0.80},
            {'vehicle_type': 'Lexus LS Executive Limousine', 'provider_name': 'Dubai Limo Corp', 'location': 'Dubai', 'price_per_km': 6.00},
            {'vehicle_type': 'Toyota Corolla Cab', 'provider_name': 'Hala Taxi Dubai', 'location': 'Dubai', 'price_per_km': 2.00},
            {'vehicle_type': 'Chauffeur Driven Microbus', 'provider_name': 'Sheba Rent-A-Car Dhaka', 'location': 'Dhaka', 'price_per_km': 1.50},
            {'vehicle_type': 'CNG Auto Rickshaw', 'provider_name': 'Local Driver Dhaka', 'location': 'Dhaka', 'price_per_km': 0.50},
        ]

        for item in rides_data:
            ride, created = RideService.objects.get_or_create(
                vehicle_type=item['vehicle_type'],
                provider_name=item['provider_name'],
                location=item['location'],
                defaults={
                    'price_per_km': item['price_per_km'],
                    'manager': manager_users['RIDE_MANAGER'],
                    'is_available': True
                }
            )
            if created:
                self.stdout.write(f"Seeded Ride: {ride.provider_name} ({ride.vehicle_type})")

        # 6. Seed pre-defined Tour Packages
        packages_data = [
            {
                'title': 'New York Luxury Escape',
                'description': 'Enjoy a premium, high-end vacation to the Big Apple! Features deluxe hotel lodging and fine dining options.',
                'destination': 'New York',
                'budget_tier': 'LUXURY',
                'duration_days': 4,
                'base_price': 1500.00
            },
            {
                'title': 'London Sightseeing Tour',
                'description': 'Discover the rich history of London with comfortable standard hotel stays and authentic traditional meals.',
                'destination': 'London',
                'budget_tier': 'STANDARD',
                'duration_days': 5,
                'base_price': 950.00
            },
            {
                'title': 'Dubai desert Safaris & Luxury Shopping',
                'description': 'Witness the architectural wonders of Dubai. Experience desert safaris, presidential suites, and high-end malls.',
                'destination': 'Dubai',
                'budget_tier': 'LUXURY',
                'duration_days': 6,
                'base_price': 2200.00
            },
            {
                'title': 'Dhaka Cultural Heritage Walk',
                'description': 'An amazing cultural journey through the historic sites of Old Dhaka, traditional markets, and spicy Bengali delicacies.',
                'destination': 'Dhaka',
                'budget_tier': 'BUDGET',
                'duration_days': 3,
                'base_price': 280.00
            }
        ]

        for item in packages_data:
            pkg, created = TourPackage.objects.get_or_create(
                title=item['title'],
                destination=item['destination'],
                defaults={
                    'description': item['description'],
                    'budget_tier': item['budget_tier'],
                    'duration_days': item['duration_days'],
                    'base_price': item['base_price'],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(f"Seeded Tour Package: {pkg.title}")

        self.stdout.write(self.style.SUCCESS("Successfully seeded database with travel inventories and packages!"))
