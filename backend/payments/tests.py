from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from tours.models import Tour
from payments.models import Payment

User = get_user_model()

class PaymentIntegrationTests(APITestCase):
    def setUp(self):
        # Create traveler
        self.traveler = User.objects.create_user(
            email='traveler@travel.com', username='traveler_john', password='Password123',
            role=User.Roles.TRAVELER, status=User.Status.APPROVED, is_email_verified=True
        )
        self.other_user = User.objects.create_user(
            email='other@travel.com', username='other_john', password='Password123',
            role=User.Roles.TRAVELER, status=User.Status.APPROVED, is_email_verified=True
        )
        
        # Create Tour
        import datetime
        self.tour = Tour.objects.create(
            traveler=self.traveler,
            title='Paris Vacation',
            budget_tier='STANDARD',
            start_date=datetime.date.today() + datetime.timedelta(days=10),
            end_date=datetime.date.today() + datetime.timedelta(days=15),
            base_cost=1000.00,
            final_price=1250.00,
            status=Tour.Status.PENDING # Starts pending
        )

    def test_payment_lock_and_unlock_flow(self):
        checkout_url = reverse('payment_checkout_session')
        mock_pay_url = reverse('payment_mock_pay')

        # 1. Traveler attempts to pay for PENDING tour (Should fail - must be LOCKED)
        self.client.force_authenticate(user=self.traveler)
        response = self.client.post(mock_pay_url, {'tour_id': self.tour.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot be paid for", response.data['error'])

        # 2. Transition tour to LOCKED (Approved status)
        self.tour.status = Tour.Status.LOCKED
        self.tour.save()

        # 3. Another user attempts to pay (Should fail - Forbidden)
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(mock_pay_url, {'tour_id': self.tour.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Correct traveler pays using Mock Simulator
        self.client.force_authenticate(user=self.traveler)
        response = self.client.post(mock_pay_url, {'tour_id': self.tour.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment']['status'], Payment.Statuses.SUCCESSFUL)

        # 5. Tour should now be UNLOCKED (Paid)
        self.tour.refresh_from_db()
        self.assertEqual(self.tour.status, Tour.Status.UNLOCKED)
        
        # 6. Retrieve payment history
        history_url = reverse('payment_history')
        response = self.client.get(history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['transaction_id'], Payment.objects.first().transaction_id)
