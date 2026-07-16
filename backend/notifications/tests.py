from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from notifications.models import InAppNotification
from notifications.utils import notify_user

User = get_user_model()

class NotificationIntegrationTests(APITestCase):
    def setUp(self):
        # Create traveler
        self.traveler = User.objects.create_user(
            email='traveler@travel.com', username='traveler_john', password='Password123',
            role=User.Roles.TRAVELER, status=User.Status.APPROVED, is_email_verified=True
        )

    def test_notification_delivery_and_read_status(self):
        # 1. Trigger notification
        notify_user(
            user=self.traveler,
            title='Test Alert',
            subject='Testing Email Subject',
            message='This is a test notification payload.'
        )

        # Verify DB insertion
        self.assertEqual(InAppNotification.objects.count(), 1)
        notif = InAppNotification.objects.first()
        self.assertEqual(notif.user, self.traveler)
        self.assertFalse(notif.is_read)

        # 2. Get Notifications List via API
        self.client.force_authenticate(user=self.traveler)
        url = reverse('notification_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Test Alert')
        self.assertFalse(response.data[0]['is_read'])

        # 3. Mark Notification as Read
        read_url = reverse('notification_mark_read', args=[notif.id])
        response = self.client.post(read_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['notification']['is_read'])

        notif.refresh_from_db()
        self.assertTrue(notif.is_read)
