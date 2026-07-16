from rest_framework import serializers
from payments.models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    tour_title = serializers.CharField(source='tour.title', read_only=True)
    traveler_email = serializers.EmailField(source='traveler.email', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'tour', 'tour_title', 'traveler', 'traveler_email', 
            'amount', 'currency', 'status', 'payment_method', 
            'transaction_id', 'created_at', 'updated_at'
        )
        read_only_fields = ('traveler', 'status', 'transaction_id')
