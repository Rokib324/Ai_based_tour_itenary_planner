from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

class AuthTests(APITestCase):
    def setUp(self):
        # Create an admin user for approval testing
        self.admin_user = User.objects.create_superuser(
            email='admin@travel.com',
            username='admin',
            password='AdminPassword123',
            role=User.Roles.ADMIN,
            status=User.Status.APPROVED,
            is_email_verified=True
        )
        
        # Test registration payload for service manager
        self.register_data = {
            'email': 'manager@travel.com',
            'username': 'manager_flight',
            'password': 'ManagerPassword123',
            'password_confirm': 'ManagerPassword123',
            'role': User.Roles.FLIGHT_MANAGER,
            'phone_number': '1234567890',
            'address': '123 Service Lane'
        }

    def test_registration_flow_and_admin_approval(self):
        # 1. Register User
        register_url = reverse('auth_register')
        response = self.client.post(register_url, self.register_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        user = User.objects.get(email='manager@travel.com')
        self.assertEqual(user.status, User.Status.PENDING)
        self.assertFalse(user.is_email_verified)
        
        # 2. Try Login (Returns token with user status PENDING so frontend can route to /pending)
        login_url = reverse('auth_login')
        login_data = {
            'email': 'manager@travel.com',
            'password': 'ManagerPassword123'
        }
        response = self.client.post(login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['status'], User.Status.PENDING)
        
        # 3. Verify Email
        verify_url = reverse('auth_verify_email')
        response = self.client.get(f"{verify_url}?email=manager@travel.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)
        self.assertEqual(user.status, User.Status.PENDING)
        
        # 4. Try Login again (User status remains PENDING until Admin approves)
        response = self.client.post(login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['status'], User.Status.PENDING)
        
        # 5. Authenticate Admin to fetch pending approvals
        self.client.force_authenticate(user=self.admin_user)
        pending_url = reverse('auth_pending_approvals')
        response = self.client.get(pending_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # 6. Approve the user
        approve_url = reverse('auth_approve_user', args=[user.id])
        response = self.client.post(approve_url, {'action': 'approve'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user.refresh_from_db()
        self.assertEqual(user.status, User.Status.APPROVED)
        
        # 7. Try Login (Should now succeed)
        self.client.force_authenticate(user=None) # Clear authentication
        response = self.client.post(login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        
        # 8. Test Logout
        refresh_token = response.data['refresh']
        access_token = response.data['access']
        logout_url = reverse('auth_logout')
        
        # Unauthorized logout attempt
        response = self.client.post(logout_url, {'refresh': refresh_token})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Authorized logout
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.post(logout_url, {'refresh': refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_profile_access_and_update(self):
        # Create a confirmed approved traveler
        traveler = User.objects.create_user(
            email='jane@travel.com',
            username='jane_doe',
            password='Password123',
            role=User.Roles.TRAVELER,
            status=User.Status.APPROVED,
            is_email_verified=True
        )
        
        # Profile is created on signals/save, or on view get_or_create
        profile_url = reverse('auth_profile')
        
        # 1. Unauthenticated profile retrieve fails
        response = self.client.get(profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # 2. Authenticate
        self.client.force_authenticate(user=traveler)
        response = self.client.get(profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], 'jane@travel.com')
        
        # 3. Update profile preferences
        update_data = {
            'phone_number': '9876543210',
            'address': '456 Voyage Rd',
            'preferred_budget_tier': 'LUXURY',
            'preferred_travel_style': 'Adventure',
            'preferred_food': 'Vegetarian'
        }
        response = self.client.put(profile_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['phone_number'], '9876543210')
        self.assertEqual(response.data['preferred_budget_tier'], 'LUXURY')
        self.assertEqual(response.data['preferred_travel_style'], 'Adventure')
        self.assertEqual(response.data['preferred_food'], 'Vegetarian')
