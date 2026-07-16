from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from tours.models import FlightService

User = get_user_model()

class ServiceCatalogTests(APITestCase):
    def setUp(self):
        # Create users with different manager roles
        self.flight_manager = User.objects.create_user(
            email='flight@travel.com',
            username='flight_mgr',
            password='Password123',
            role=User.Roles.FLIGHT_MANAGER,
            status=User.Status.APPROVED,
            is_email_verified=True
        )
        self.hotel_manager = User.objects.create_user(
            email='hotel@travel.com',
            username='hotel_mgr',
            password='Password123',
            role=User.Roles.HOTEL_MANAGER,
            status=User.Status.APPROVED,
            is_email_verified=True
        )
        self.traveler = User.objects.create_user(
            email='traveler@travel.com',
            username='traveler_john',
            password='Password123',
            role=User.Roles.TRAVELER,
            status=User.Status.APPROVED,
            is_email_verified=True
        )

        self.flight_payload = {
            'name': 'Fly Emirates',
            'flight_number': 'EK-201',
            'departure_city': 'Dubai',
            'destination_city': 'New York',
            'price': '450.00'
        }

    def test_flight_creation_and_rbac(self):
        url = reverse('flight-service-list')

        # 1. Anonymous user cannot create flight
        response = self.client.post(url, self.flight_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Traveler cannot create flight (Forbidden)
        self.client.force_authenticate(user=self.traveler)
        response = self.client.post(url, self.flight_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Hotel Manager cannot create flight (Forbidden)
        self.client.force_authenticate(user=self.hotel_manager)
        response = self.client.post(url, self.flight_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Flight Manager can create flight
        self.client.force_authenticate(user=self.flight_manager)
        response = self.client.post(url, self.flight_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FlightService.objects.count(), 1)
        self.assertEqual(FlightService.objects.first().manager, self.flight_manager)

        # 5. Traveler can view/list flights
        self.client.force_authenticate(user=self.traveler)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['flight_number'], 'EK-201')

    def test_tour_creation_and_pricing_workflow(self):
        # Create inventory items
        flight = FlightService.objects.create(
            name='United', flight_number='UA-100', departure_city='SFO', destination_city='NYC', price=300.00, manager=self.flight_manager
        )
        from tours.models import HotelService, Tour
        hotel = HotelService.objects.create(
            name='Hilton', location='NYC', room_type='Deluxe', price_per_night=150.00, manager=self.hotel_manager
        )
        
        # 1. Create a custom tour
        url = reverse('tour-list')
        self.client.force_authenticate(user=self.traveler)
        tour_payload = {
            'title': 'NYC Business Trip',
            'budget_tier': 'STANDARD',
            'start_date': '2026-10-01',
            'end_date': '2026-10-05',
            'new_items': [
                {'flight': flight.id, 'quantity': 1},
                {'hotel': hotel.id, 'quantity': 4}  # 4 nights
            ]
        }
        response = self.client.post(url, tour_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        tour_id = response.data['id']
        tour = Tour.objects.get(id=tour_id)
        
        # Base cost should be: flight (300) + hotel (150 * 4 = 600) = 900
        self.assertEqual(float(tour.base_cost), 900.00)
        # STANDARD markup is 25%. Final price = 900 * 1.25 = 1125
        self.assertEqual(float(tour.final_price), 1125.00)
        self.assertEqual(float(tour.markup_percentage), 25.00)
        
        # 2. Submit tour to start approvals
        submit_url = reverse('tour-detail', args=[tour.id]) + 'submit/'
        response = self.client.post(submit_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify approval workflow skipping logic
        from approvals.models import TourApproval, ApprovalStatus
        approval = TourApproval.objects.get(tour=tour)
        # We selected Flight & Hotel. We did NOT select Restaurant & Ride.
        self.assertEqual(approval.flight_status, ApprovalStatus.PENDING)
        self.assertEqual(approval.hotel_status, ApprovalStatus.PENDING)
        self.assertEqual(approval.restaurant_status, ApprovalStatus.SKIPPED)
        self.assertEqual(approval.ride_status, ApprovalStatus.SKIPPED)

    def test_ai_recommendation_and_analysis_endpoints(self):
        # Create a package matching traveler preferred style
        from tours.models import TourPackage
        pkg = TourPackage.objects.create(
            title='Adventure Tour of Dubai',
            description='An adventure-packed tour with dune bashing and food safari.',
            destination='Dubai',
            budget_tier='LUXURY',
            base_price=2000.00
        )
        
        # Configure traveler profile preferences
        profile = self.traveler.profile
        profile.preferred_budget_tier = 'LUXURY'
        profile.preferred_travel_style = 'Adventure'
        profile.save()
        
        # 1. Fetch AI package recommendation
        self.client.force_authenticate(user=self.traveler)
        recommend_url = reverse('tour-package-list') + 'ai-recommend/'
        response = self.client.get(recommend_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return Dubai adventure package with high score
        self.assertTrue(len(response.data) > 0)
        self.assertEqual(response.data[0]['title'], 'Adventure Tour of Dubai')
        self.assertEqual(response.data[0]['score'], 80) # 50 (budget) + 30 (style)
        
        # Create a dummy tour for analysis
        from tours.models import Tour
        import datetime
        tour = Tour.objects.create(
            traveler=self.traveler,
            title='Dubai Custom Adventure',
            budget_tier='LUXURY',
            start_date=datetime.date.today() + datetime.timedelta(days=30),
            end_date=datetime.date.today() + datetime.timedelta(days=35),
            base_cost=1500.00,
            final_price=1980.00
        )
        
        # 2. Fetch AI analysis for the tour
        analysis_url = reverse('tour-detail', args=[tour.id]) + 'ai-analysis/'
        response = self.client.get(analysis_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('approval_probability', response.data)
        self.assertIn('future_cost_prediction', response.data)
        self.assertIn('cheaper_alternatives', response.data)
        self.assertIn('weather_recommendations', response.data)
