from rest_framework import serializers
from approvals.models import TourApproval, ManagerApproval
from tours.serializers import TourSerializer

class ManagerApprovalSerializer(serializers.ModelSerializer):
    manager_email = serializers.EmailField(source='manager.email', read_only=True)

    class Meta:
        model = ManagerApproval
        fields = ('id', 'workflow', 'manager', 'manager_email', 'service_type', 'status', 'comments', 'actioned_at')
        read_only_fields = ('manager', 'actioned_at')


class TourApprovalSerializer(serializers.ModelSerializer):
    tour_details = TourSerializer(source='tour', read_only=True)
    manager_logs = ManagerApprovalSerializer(many=True, read_only=True)

    class Meta:
        model = TourApproval
        fields = (
            'id', 'tour', 'tour_details', 'admin_status', 'flight_status', 
            'hotel_status', 'restaurant_status', 'ride_status', 
            'decision_engine_status', 'admin_remarks', 'decision_remarks',
            'manager_logs', 'created_at', 'updated_at'
        )
        read_only_fields = ('decision_engine_status', 'decision_remarks', 'created_at', 'updated_at')
