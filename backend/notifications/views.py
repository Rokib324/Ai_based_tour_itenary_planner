from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from notifications.models import InAppNotification
from notifications.serializers import InAppNotificationSerializer

class NotificationListView(generics.ListAPIView):
    serializer_class = InAppNotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Users see their own in-app notifications only
        return InAppNotification.objects.filter(user=self.request.user)


class MarkNotificationReadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            notification = InAppNotification.objects.get(id=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({
                "message": "Notification marked as read.",
                "notification": InAppNotificationSerializer(notification).data
            }, status=status.HTTP_200_OK)
        except InAppNotification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
