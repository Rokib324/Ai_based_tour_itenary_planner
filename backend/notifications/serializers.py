from rest_framework import serializers
from notifications.models import InAppNotification

class InAppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InAppNotification
        fields = ('id', 'title', 'message', 'is_read', 'created_at')
        read_only_fields = ('title', 'message', 'created_at')
