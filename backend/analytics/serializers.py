from rest_framework import serializers
from analytics.models import ActivityLog, ProfitAnalytics

class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ('id', 'user', 'user_email', 'action', 'details', 'ip_address', 'created_at')
        read_only_fields = fields


class ProfitAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfitAnalytics
        fields = ('id', 'record_date', 'total_revenue', 'total_cost', 'total_profit', 'margin_percentage')
        read_only_fields = fields
