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
            # Bangladesh Domestic & Regional
            {'name': 'Biman Bangladesh BG-433', 'flight_number': 'BG-433', 'departure_city': 'Dhaka', 'destination_city': "Cox's Bazar", 'price': 75.00},
            {'name': 'US-Bangla Airlines BS-141', 'flight_number': 'BS-141', 'departure_city': 'Dhaka', 'destination_city': "Cox's Bazar", 'price': 65.00},
            {'name': 'Novoair VQ-921', 'flight_number': 'VQ-921', 'departure_city': 'Dhaka', 'destination_city': "Cox's Bazar", 'price': 60.00},
            {'name': 'Biman Bangladesh BG-601', 'flight_number': 'BG-601', 'departure_city': 'Dhaka', 'destination_city': 'Sylhet', 'price': 50.00},
            {'name': 'US-Bangla Airlines BS-135', 'flight_number': 'BS-135', 'departure_city': 'Dhaka', 'destination_city': 'Sylhet', 'price': 45.00},
            {'name': 'Air Astra 2A-441', 'flight_number': '2A-441', 'departure_city': 'Dhaka', 'destination_city': 'Chittagong', 'price': 55.00},
            {'name': 'Biman Bangladesh BG-115', 'flight_number': 'BG-115', 'departure_city': 'Dhaka', 'destination_city': 'Chittagong', 'price': 50.00},
            
            # International Hubs
            {'name': 'Delta Airlines DL-100', 'flight_number': 'DL-100', 'departure_city': 'Dhaka', 'destination_city': 'New York', 'price': 850.00},
            {'name': 'Delta Airlines DL-200', 'flight_number': 'DL-200', 'departure_city': 'London', 'destination_city': 'New York', 'price': 450.00},
            {'name': 'British Airways BA-111', 'flight_number': 'BA-111', 'departure_city': 'New York', 'destination_city': 'London', 'price': 520.00},
            {'name': 'British Airways BA-222', 'flight_number': 'BA-222', 'departure_city': 'Dhaka', 'destination_city': 'London', 'price': 780.00},
            {'name': 'Emirates EK-501', 'flight_number': 'EK-501', 'departure_city': 'New York', 'destination_city': 'Dubai', 'price': 980.00},
            {'name': 'Emirates EK-502', 'flight_number': 'EK-502', 'departure_city': 'London', 'destination_city': 'Dubai', 'price': 380.00},
            {'name': 'Biman Bangladesh BG-047', 'flight_number': 'BG-047', 'departure_city': 'London', 'destination_city': 'Dhaka', 'price': 650.00},
            {'name': 'Biman Bangladesh BG-084', 'flight_number': 'BG-084', 'departure_city': 'Dubai', 'destination_city': 'Dhaka', 'price': 420.00},
            {'name': 'Air France AF-105', 'flight_number': 'AF-105', 'departure_city': 'London', 'destination_city': 'Paris', 'price': 180.00},
            {'name': 'Air France AF-302', 'flight_number': 'AF-302', 'departure_city': 'New York', 'destination_city': 'Paris', 'price': 620.00},
            {'name': 'Japan Airlines JL-005', 'flight_number': 'JL-005', 'departure_city': 'New York', 'destination_city': 'Tokyo', 'price': 1100.00},
            {'name': 'Singapore Airlines SQ-318', 'flight_number': 'SQ-318', 'departure_city': 'Dhaka', 'destination_city': 'Singapore', 'price': 380.00},
            {'name': 'Thai Airways TG-322', 'flight_number': 'TG-322', 'departure_city': 'Dhaka', 'destination_city': 'Bangkok', 'price': 290.00},
            {'name': 'Garuda Indonesia GA-882', 'flight_number': 'GA-882', 'departure_city': 'Singapore', 'destination_city': 'Bali', 'price': 195.00},
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
            # Cox's Bazar
            {'name': "Sayeman Beach Resort", 'location': "Cox's Bazar", 'room_type': 'Ocean View Suite', 'price_per_night': 140.00},
            {'name': "Seagull Hotel", 'location': "Cox's Bazar", 'room_type': 'Deluxe Room', 'price_per_night': 85.00},
            {'name': "Hotel Sea Crown", 'location': "Cox's Bazar", 'room_type': 'Standard Sea Facing', 'price_per_night': 45.00},
            {'name': "Mermaid Beach Resort", 'location': "Cox's Bazar", 'room_type': 'Luxury Cottage', 'price_per_night': 190.00},

            # Sylhet
            {'name': 'Grand Sultan Tea Resort & Golf', 'location': 'Sylhet', 'room_type': 'King Deluxe Suite', 'price_per_night': 160.00},
            {'name': 'Hotel Noorjahan Grand', 'location': 'Sylhet', 'room_type': 'Executive Twin', 'price_per_night': 55.00},
            {'name': 'Rose View Hotel', 'location': 'Sylhet', 'room_type': 'Standard Deluxe', 'price_per_night': 70.00},

            # Chittagong
            {'name': 'Radisson Blu Chattogram Bay View', 'location': 'Chittagong', 'room_type': 'Superior King', 'price_per_night': 130.00},
            {'name': 'Hotel Agrabad', 'location': 'Chittagong', 'room_type': 'Standard Room', 'price_per_night': 60.00},

            # Dhaka
            {'name': 'Pan Pacific Sonargaon', 'location': 'Dhaka', 'room_type': 'Executive Suite', 'price_per_night': 180.00},
            {'name': 'Hotel Ornate', 'location': 'Dhaka', 'room_type': 'Standard Single', 'price_per_night': 35.00},
            {'name': 'InterContinental Dhaka', 'location': 'Dhaka', 'room_type': 'Luxury King', 'price_per_night': 210.00},

            # New York
            {'name': 'The Ritz-Carlton Central Park', 'location': 'New York', 'room_type': 'Deluxe Room', 'price_per_night': 450.00},
            {'name': 'Pod 39 Budget Pods', 'location': 'New York', 'room_type': 'Standard Queen', 'price_per_night': 120.00},

            # London
            {'name': 'The Savoy London', 'location': 'London', 'room_type': 'Superior Suite', 'price_per_night': 550.00},
            {'name': 'Generator Hostel London', 'location': 'London', 'room_type': 'Shared Dorm', 'price_per_night': 45.00},

            # Dubai
            {'name': 'Burj Al Arab Jumeirah', 'location': 'Dubai', 'room_type': 'Presidential Suite', 'price_per_night': 1200.00},
            {'name': 'Rove Downtown Dubai', 'location': 'Dubai', 'room_type': 'Rover Room', 'price_per_night': 95.00},

            # Paris & Tokyo & Bali
            {'name': 'Le Meurice Paris', 'location': 'Paris', 'room_type': 'Classic French Suite', 'price_per_night': 650.00},
            {'name': 'Hotel Saint-Germain', 'location': 'Paris', 'room_type': 'Standard Double', 'price_per_night': 140.00},
            {'name': 'Aman Tokyo', 'location': 'Tokyo', 'room_type': 'Imperial City View', 'price_per_night': 850.00},
            {'name': 'Hotel Gracery Shinjuku', 'location': 'Tokyo', 'room_type': 'Comfort Twin', 'price_per_night': 130.00},
            {'name': 'Four Seasons Resort Bali Sayan', 'location': 'Bali', 'room_type': 'Riverfront Pool Villa', 'price_per_night': 490.00},
            {'name': 'Ubud Village Hotel', 'location': 'Bali', 'room_type': 'Deluxe Garden Room', 'price_per_night': 75.00},

            # Singapore & Bangkok & Rome
            {'name': 'Marina Bay Sands Luxury Suites', 'location': 'Singapore', 'room_type': 'Grand Deluxe Bay View', 'price_per_night': 420.00},
            {'name': 'Carlton Hotel Singapore', 'location': 'Singapore', 'room_type': 'Executive King Room', 'price_per_night': 175.00},
            {'name': 'Hotel G Singapore', 'location': 'Singapore', 'room_type': 'Comfort Queen Room', 'price_per_night': 85.00},
            {'name': 'The Peninsula Bangkok', 'location': 'Bangkok', 'room_type': 'Grand Deluxe River Suite', 'price_per_night': 260.00},
            {'name': 'Hotel Indigo Bangkok', 'location': 'Bangkok', 'room_type': 'Standard King Room', 'price_per_night': 95.00},
            {'name': 'Hotel Hassler Roma', 'location': 'Rome', 'room_type': 'Spanish Steps Suite', 'price_per_night': 580.00},
            {'name': 'Hotel Artemide Rome', 'location': 'Rome', 'room_type': 'Superior Double', 'price_per_night': 160.00},
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
            # Cox's Bazar
            {'name': "Jhaubon Restaurant", 'location': "Cox's Bazar", 'cuisine': 'Fresh Seafood & Bengali Vorta', 'price_per_meal': 12.00},
            {'name': "Mermaid Cafe Marine Drive", 'location': "Cox's Bazar", 'cuisine': 'Beachfront Continental & Seafood', 'price_per_meal': 25.00},
            {'name': "Poushee Restaurant", 'location': "Cox's Bazar", 'cuisine': 'Authentic Bengali Fish & Rice', 'price_per_meal': 8.00},

            # Sylhet
            {'name': 'Panshi Restaurant', 'location': 'Sylhet', 'cuisine': 'Traditional Bengali Beef & Khichuri', 'price_per_meal': 7.00},
            {'name': 'Woondaal King Kebab', 'location': 'Sylhet', 'cuisine': 'Mughlai & Grilled Kebabs', 'price_per_meal': 14.00},

            # Chittagong
            {'name': 'Mezban Haat Chattogram', 'location': 'Chittagong', 'cuisine': 'Traditional Mezbani Beef & Dal', 'price_per_meal': 9.00},
            {'name': 'Barcode Cafe', 'location': 'Chittagong', 'cuisine': 'Continental & Pasta', 'price_per_meal': 16.00},

            # Dhaka
            {'name': 'Kasturi Restaurant', 'location': 'Dhaka', 'cuisine': 'Traditional Bengali', 'price_per_meal': 10.00},
            {'name': 'Star Kabab & Restaurant', 'location': 'Dhaka', 'cuisine': 'Kabab / Biryani', 'price_per_meal': 8.00},

            # New York
            {'name': 'Eleven Madison Park', 'location': 'New York', 'cuisine': 'Fine Dining', 'price_per_meal': 150.00},
            {'name': "Joe's Pizza Greenwich Village", 'location': 'New York', 'cuisine': 'Pizza / Street Food', 'price_per_meal': 12.00},

            # London
            {'name': 'Dinner by Heston Blumenthal', 'location': 'London', 'cuisine': 'Historic British', 'price_per_meal': 95.00},
            {'name': 'Poppies Fish & Chips Soho', 'location': 'London', 'cuisine': 'Traditional British', 'price_per_meal': 18.00},

            # Dubai
            {'name': 'Zuma contemporary Japanese', 'location': 'Dubai', 'cuisine': 'Contemporary Japanese', 'price_per_meal': 110.00},
            {'name': 'Al Ustad Special Kabab', 'location': 'Dubai', 'cuisine': 'Traditional Persian / Kabab', 'price_per_meal': 15.00},

            # Paris & Tokyo & Bali
            {'name': 'Le Jules Verne Eiffel Tower', 'location': 'Paris', 'cuisine': 'Contemporary French Haute Cuisine', 'price_per_meal': 140.00},
            {'name': 'Bouillon Chartier', 'location': 'Paris', 'cuisine': 'Classic French Bistro', 'price_per_meal': 22.00},
            {'name': 'Sukiyabashi Jiro Ginza', 'location': 'Tokyo', 'cuisine': 'Edomae Sushi', 'price_per_meal': 180.00},
            {'name': 'Ichiran Ramen Shibuya', 'location': 'Tokyo', 'cuisine': 'Tonkotsu Ramen', 'price_per_meal': 14.00},
            {'name': 'Locavore Ubud Bali', 'location': 'Bali', 'cuisine': 'Farm-to-Table Indonesian', 'price_per_meal': 45.00},
            {'name': 'Warung Ibu Oka', 'location': 'Bali', 'cuisine': 'Traditional Balinese Feast', 'price_per_meal': 10.00},

            # Singapore & Bangkok & Rome
            {'name': 'Jumbo Seafood Clarke Quay', 'location': 'Singapore', 'cuisine': 'Singapore Chili Crab & Seafood', 'price_per_meal': 45.00},
            {'name': 'Liao Fan Hawker Chan', 'location': 'Singapore', 'cuisine': 'Michelin Soya Sauce Chicken Rice', 'price_per_meal': 8.50},
            {'name': 'Jay Fai Michelin Street Eatery', 'location': 'Bangkok', 'cuisine': 'Famous Crab Meat Omelette', 'price_per_meal': 38.00},
            {'name': 'Thip Samai Pad Thai', 'location': 'Bangkok', 'cuisine': 'Authentic Bangkok Pad Thai', 'price_per_meal': 7.00},
            {'name': 'La Pergola Rome', 'location': 'Rome', 'cuisine': '3-Michelin Star Gourmet Italian', 'price_per_meal': 165.00},
            {'name': 'Da Enzo al 29 Trastevere', 'location': 'Rome', 'cuisine': 'Traditional Roman Cacio e Pepe', 'price_per_meal': 24.00},
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
            # Cox's Bazar
            {'vehicle_type': 'Chander Gari (Open 4x4 Safari)', 'provider_name': "Cox's Bazar Beach Safari", 'location': "Cox's Bazar", 'price_per_km': 1.80},
            {'vehicle_type': 'Private AC Sedan Car', 'provider_name': 'Marine Drive Express', 'location': "Cox's Bazar", 'price_per_km': 1.20},
            {'vehicle_type': 'Electric TomTom Auto', 'provider_name': 'Beach Eco Transit', 'location': "Cox's Bazar", 'price_per_km': 0.40},

            # Sylhet
            {'vehicle_type': 'Tea Garden 4WD Jeep', 'provider_name': 'Sylhet Eco Safari', 'location': 'Sylhet', 'price_per_km': 1.50},
            {'vehicle_type': 'AC Microbus HiAce', 'provider_name': 'Jaflong Tourist Rides', 'location': 'Sylhet', 'price_per_km': 1.10},

            # Chittagong
            {'vehicle_type': 'Coastal Highway Cruiser', 'provider_name': 'Chattogram Cab Service', 'location': 'Chittagong', 'price_per_km': 1.30},

            # Dhaka
            {'vehicle_type': 'Chauffeur Driven Microbus', 'provider_name': 'Sheba Rent-A-Car Dhaka', 'location': 'Dhaka', 'price_per_km': 1.50},
            {'vehicle_type': 'CNG Auto Rickshaw', 'provider_name': 'Local Driver Dhaka', 'location': 'Dhaka', 'price_per_km': 0.50},

            # New York
            {'vehicle_type': 'Tesla Model Y Lux', 'provider_name': 'Uber Black NYC', 'location': 'New York', 'price_per_km': 4.50},
            {'vehicle_type': 'Toyota Camry Sedan', 'provider_name': 'Yellow Cab NYC', 'location': 'New York', 'price_per_km': 1.80},

            # London
            {'vehicle_type': 'Mercedes E-Class Executive', 'provider_name': 'Black Cab London', 'location': 'London', 'price_per_km': 5.00},
            {'vehicle_type': 'Double-Decker Transit pass', 'provider_name': 'TFL London', 'location': 'London', 'price_per_km': 0.80},

            # Dubai
            {'vehicle_type': 'Lexus LS Executive Limousine', 'provider_name': 'Dubai Limo Corp', 'location': 'Dubai', 'price_per_km': 6.00},
            {'vehicle_type': 'Toyota Corolla Cab', 'provider_name': 'Hala Taxi Dubai', 'location': 'Dubai', 'price_per_km': 2.00},

            # Paris & Tokyo & Bali
            {'vehicle_type': 'Mercedes S-Class Chauffeured', 'provider_name': 'Paris Prestige Limo', 'location': 'Paris', 'price_per_km': 5.50},
            {'vehicle_type': 'Toyota Alphard Luxury Van', 'provider_name': 'Nihon Kanko Tokyo', 'location': 'Tokyo', 'price_per_km': 4.20},
            {'vehicle_type': 'Toyota Avanza Private Driver', 'provider_name': 'Bali Island Tour Driver', 'location': 'Bali', 'price_per_km': 0.90},

            # Singapore & Bangkok & Rome
            {'vehicle_type': 'Singapore Premium Grab Sedan', 'provider_name': 'Singapore City Grab', 'location': 'Singapore', 'price_per_km': 1.80},
            {'vehicle_type': 'Bangkok AC Highway Taxi', 'provider_name': 'Bangkok Green-Yellow Cabs', 'location': 'Bangkok', 'price_per_km': 0.70},
            {'vehicle_type': 'Rome Historic White Cab', 'provider_name': 'Radio Taxi Roma', 'location': 'Rome', 'price_per_km': 2.10},
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
            # Cox's Bazar
            {
                'title': "Cox's Bazar Coastal Haven",
                'description': "Experience the longest natural sandy sea beach in the world! Includes beach resort stay, seafood feasts on Marine Drive, and Himchari excursions.",
                'destination': "Cox's Bazar",
                'budget_tier': 'STANDARD',
                'duration_days': 4,
                'base_price': 340.00
            },
            {
                'title': "Cox's Bazar Luxury Beach & Sunset Escape",
                'description': "Indulge in five-star ocean-view suites, private sunset safaris along Inani beach, and gourmet beachfront dining.",
                'destination': "Cox's Bazar",
                'budget_tier': 'LUXURY',
                'duration_days': 5,
                'base_price': 780.00
            },
            {
                'title': "Cox's Bazar Backpacker & Surf Special",
                'description': "Budget-friendly seaside journey covering Saint Martin boat access, surf lessons, and authentic local seafood.",
                'destination': "Cox's Bazar",
                'budget_tier': 'BUDGET',
                'duration_days': 3,
                'base_price': 160.00
            },

            # Sylhet
            {
                'title': 'Sylhet Tea Highlands & Ratargul Forest',
                'description': 'Immerse yourself in verdant rolling tea gardens of Sreemangal and boat safaris through the mystical Ratargul freshwater swamp forest.',
                'destination': 'Sylhet',
                'budget_tier': 'STANDARD',
                'duration_days': 4,
                'base_price': 290.00
            },
            {
                'title': 'Sylhet Luxury Tea Valley & Spa Retreat',
                'description': 'Five-star golf resort living surrounded by lush tea valleys, infinity pools, and fine multi-cuisine dining.',
                'destination': 'Sylhet',
                'budget_tier': 'LUXURY',
                'duration_days': 4,
                'base_price': 620.00
            },

            # Chittagong
            {
                'title': 'Chittagong Coastal Heritage & Shipyard Walk',
                'description': 'Explore Patenga sea beach, historical shrines, Foy’s Lake amusement park, and authentic spicy Mezbani beef banquets.',
                'destination': 'Chittagong',
                'budget_tier': 'STANDARD',
                'duration_days': 3,
                'base_price': 260.00
            },

            # Dhaka
            {
                'title': 'Dhaka Cultural Heritage Walk',
                'description': 'An amazing cultural journey through the historic sites of Old Dhaka, traditional riverfronts, and spicy Bengali delicacies.',
                'destination': 'Dhaka',
                'budget_tier': 'BUDGET',
                'duration_days': 3,
                'base_price': 220.00
            },

            # New York
            {
                'title': 'New York Luxury Escape',
                'description': 'Enjoy a premium, high-end vacation to the Big Apple! Features deluxe hotel lodging and fine dining options.',
                'destination': 'New York',
                'budget_tier': 'LUXURY',
                'duration_days': 4,
                'base_price': 1500.00
            },

            # London
            {
                'title': 'London Sightseeing Tour',
                'description': 'Discover the rich history of London with comfortable standard hotel stays and authentic traditional meals.',
                'destination': 'London',
                'budget_tier': 'STANDARD',
                'duration_days': 5,
                'base_price': 950.00
            },

            # Dubai
            {
                'title': 'Dubai desert Safaris & Luxury Shopping',
                'description': 'Witness the architectural wonders of Dubai. Experience desert safaris, presidential suites, and high-end malls.',
                'destination': 'Dubai',
                'budget_tier': 'LUXURY',
                'duration_days': 6,
                'base_price': 2200.00
            },

            # Paris & Tokyo & Bali
            {
                'title': 'Paris Art Deco & Louvre Wonders',
                'description': 'Romantic strolls along the Seine, private Louvre museum tour, and dinners with direct view of the Eiffel Tower.',
                'destination': 'Paris',
                'budget_tier': 'STANDARD',
                'duration_days': 5,
                'base_price': 1250.00
            },
            {
                'title': 'Tokyo Cyberpunk & Neon City Nights',
                'description': 'Futuristic Tokyo tour: Shibuya crossing, Akihabara tech centers, Michelin sushi, and Shinjuku neon towers.',
                'destination': 'Tokyo',
                'budget_tier': 'LUXURY',
                'duration_days': 6,
                'base_price': 2890.00
            },
            {
                'title': 'Bali Sacred Rice Terraces & Beach Villas',
                'description': 'Serene tropical vacation exploring Ubud sacred monkey sanctuaries, Tegalalang rice terraces, and Uluwatu cliff temples.',
                'destination': 'Bali',
                'budget_tier': 'BUDGET',
                'duration_days': 5,
                'base_price': 780.00
            },
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
