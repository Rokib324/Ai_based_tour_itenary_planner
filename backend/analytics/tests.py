from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

class DashboardIntegrationTests(APITestCase):
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
        self.traveler = User.objects.create_user(
            email='traveler@travel.com', username='traveler_john', password='Password123',
            role=User.Roles.TRAVELER, status=User.Status.APPROVED, is_email_verified=True
        )

    def test_dashboard_rbac_access_controls(self):
        traveler_url = reverse('dashboard_traveler')
        manager_url = reverse('dashboard_manager')
        admin_url = reverse('dashboard_admin')

        # 1. Unauthenticated users are blocked (401)
        response = self.client.get(traveler_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Traveler dashboard access
        self.client.force_authenticate(user=self.traveler)
        response = self.client.get(traveler_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("metrics", response.data)
        
        # Traveler blocked from Admin dashboard (403)
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Manager dashboard access
        self.client.force_authenticate(user=self.flight_manager)
        response = self.client.get(manager_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("assigned_requests_count", response.data['metrics'])

        # 4. Admin dashboard access
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("financials", response.data)

    def test_activity_logs_and_profit_aggregators(self):
        from tours.models import Tour
        from payments.models import Payment
        import datetime

        # Create paid tour
        tour = Tour.objects.create(
            traveler=self.traveler,
            title='Venice Holiday',
            budget_tier='STANDARD',
            start_date=datetime.date.today() + datetime.timedelta(days=10),
            end_date=datetime.date.today() + datetime.timedelta(days=15),
            base_cost=1000.00,
            final_price=1250.00,
            status=Tour.Status.LOCKED
        )

        payment = Payment.objects.create(
            tour=tour,
            traveler=self.traveler,
            amount=1250.00,
            currency='USD',
            status=Payment.Statuses.SUCCESSFUL,
            payment_method='Stripe',
            transaction_id='tx_test_123'
        )

        # Trigger verify_payment to build ProfitAnalytics record and log activity
        payment.verify_payment()

        # Check DB entries
        from analytics.models import ActivityLog, ProfitAnalytics
        self.assertTrue(ActivityLog.objects.filter(action='TOUR_PAYMENT_SUCCESSFUL').exists())
        self.assertTrue(ProfitAnalytics.objects.filter(record_date=datetime.date.today()).exists())

        # Test listing endpoints via API as Admin
        self.client.force_authenticate(user=self.admin)
        
        # 1. Activity Logs API
        logs_url = reverse('activity_logs_list')
        response = self.client.get(logs_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
        self.assertEqual(response.data[0]['action'], 'TOUR_PAYMENT_SUCCESSFUL')

        # 2. Profits Aggregates API
        profits_url = reverse('profit_analytics_list')
        response = self.client.get(profits_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
        self.assertEqual(float(response.data[0]['total_profit']), 250.00)

