from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from tours.models import Tour, TourItem, FlightService, HotelService
from approvals.models import TourApproval, ApprovalStatus

User = get_user_model()

class ApprovalsWorkflowTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_superuser(
            email='admin@travel.com', username='admin', password='Password123',
            role=User.Roles.ADMIN, status=User.Status.APPROVED, is_email_verified=True
        )
        self.flight_manager = User.objects.create_user(
            email='flight@travel.com', username='flight_mgr', password='Password123',
            role=User.Roles.FLIGHT_MANAGER, status=User.Status.APPROVED, is_email_verified=True
        )
        self.hotel_manager = User.objects.create_user(
            email='hotel@travel.com', username='hotel_mgr', password='Password123',
            role=User.Roles.HOTEL_MANAGER, status=User.Status.APPROVED, is_email_verified=True
        )
        self.traveler = User.objects.create_user(
            email='traveler@travel.com', username='traveler_john', password='Password123',
            role=User.Roles.TRAVELER, status=User.Status.APPROVED, is_email_verified=True
        )

        # Setup services
        self.flight = FlightService.objects.create(
            name='Emirates', flight_number='EK-900', departure_city='DXB', destination_city='LHR', price=500.00, manager=self.flight_manager
        )
        self.hotel = HotelService.objects.create(
            name='Marriott', location='LHR', room_type='Deluxe', price_per_night=200.00, manager=self.hotel_manager
        )

        # Create Tour
        import datetime
        self.tour = Tour.objects.create(
            traveler=self.traveler,
            title='London Summer Trip',
            budget_tier='STANDARD',
            start_date=datetime.date.today() + datetime.timedelta(days=10),
            end_date=datetime.date.today() + datetime.timedelta(days=15)
        )
        TourItem.objects.create(tour=self.tour, flight=self.flight, quantity=1)
        TourItem.objects.create(tour=self.tour, hotel=self.hotel, quantity=5)
        
        # Calculate dynamic prices
        self.tour.calculate_prices()
        self.tour.save()

    def test_sequential_approval_workflow_engine(self):
        # 1. Submit Tour
        self.client.force_authenticate(user=self.traveler)
        submit_url = reverse('tour-detail', args=[self.tour.id]) + 'submit/'
        response = self.client.post(submit_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        workflow = TourApproval.objects.get(tour=self.tour)
        self.assertEqual(workflow.admin_status, ApprovalStatus.PENDING)
        self.assertEqual(workflow.flight_status, ApprovalStatus.PENDING)
        self.assertEqual(workflow.hotel_status, ApprovalStatus.PENDING)
        # Skipped because they aren't in the tour
        self.assertEqual(workflow.restaurant_status, ApprovalStatus.SKIPPED)
        self.assertEqual(workflow.ride_status, ApprovalStatus.SKIPPED)

        action_url = reverse('tour-approval-process-action', args=[workflow.id])

        # 2. Try Hotel Manager signoff before Admin approval (Should return 400 Bad Request)
        self.client.force_authenticate(user=self.hotel_manager)
        response = self.client.post(action_url, {'status': ApprovalStatus.APPROVED, 'comments': 'Looks good'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "Cannot action. Previous checkpoints have not completed.")

        # 3. Admin Approves
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(action_url, {'status': ApprovalStatus.APPROVED, 'comments': 'Admin approved'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workflow.refresh_from_db()
        self.assertEqual(workflow.admin_status, ApprovalStatus.APPROVED)

        # 4. Try Hotel Manager signoff before Flight Manager (Should return 400 Bad Request)
        self.client.force_authenticate(user=self.hotel_manager)
        response = self.client.post(action_url, {'status': ApprovalStatus.APPROVED, 'comments': 'Room is available'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Flight Manager Approves
        self.client.force_authenticate(user=self.flight_manager)
        response = self.client.post(action_url, {'status': ApprovalStatus.APPROVED, 'comments': 'Seats verified'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workflow.refresh_from_db()
        self.assertEqual(workflow.flight_status, ApprovalStatus.APPROVED)

        # 6. Hotel Manager Approves (now allowed)
        self.client.force_authenticate(user=self.hotel_manager)
        response = self.client.post(action_url, {'status': ApprovalStatus.APPROVED, 'comments': 'Room verified'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        workflow.refresh_from_db()
        self.assertEqual(workflow.hotel_status, ApprovalStatus.APPROVED)
        
        # 7. Verify Decision Engine Transition to LOCKED
        self.assertEqual(workflow.decision_engine_status, ApprovalStatus.APPROVED)
        
        # Refreshed tour status must now be LOCKED (awaiting payment)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, Tour.Status.LOCKED)
