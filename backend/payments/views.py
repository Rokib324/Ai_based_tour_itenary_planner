import json
import stripe
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from tours.models import Tour
from payments.models import Payment
from payments.serializers import PaymentSerializer
from users.models import User

# Configure Stripe key
stripe.api_key = settings.STRIPE_SECRET_KEY

class CreateCheckoutSessionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        tour_id = request.data.get('tour_id')
        if not tour_id:
            return Response({"error": "tour_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            tour = Tour.objects.get(id=tour_id)
        except Tour.DoesNotExist:
            return Response({"error": "Tour not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Permission Check
        if tour.traveler != request.user and request.user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return Response({"detail": "You do not have permission to pay for this tour."}, status=status.HTTP_403_FORBIDDEN)
            
        # Status Check: Tour must be LOCKED (awaiting payment)
        if tour.status != Tour.Status.LOCKED:
            return Response({"error": f"Tour cannot be paid for. Current status is: {tour.status}"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create Stripe Checkout Session
        # Convert final_price to cents
        amount_cents = int(tour.final_price * 100)
        
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': tour.title,
                            'description': f"Smart Tour: {tour.budget_tier} Tier",
                        },
                        'unit_amount': amount_cents,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                client_reference_id=str(tour.id),
                success_url=request.build_absolute_uri('/api/v1/payments/success/'),
                cancel_url=request.build_absolute_uri('/api/v1/payments/cancel/'),
                metadata={
                    'tour_id': tour.id,
                    'traveler_email': tour.traveler.email
                }
            )
            
            # Create a pending Payment record
            Payment.objects.create(
                tour=tour,
                traveler=tour.traveler,
                amount=tour.final_price,
                currency='USD',
                status=Payment.Statuses.PENDING,
                payment_method='Stripe',
                transaction_id=session.id
            )
            
            return Response({
                "checkout_url": session.url,
                "session_id": session.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": f"Stripe session creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
        
        event = None
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError as e:
            # Invalid payload
            return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Handle checkout.session.completed event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            tour_id = session.get('client_reference_id')
            transaction_id = session.get('id')
            payment_intent_id = session.get('payment_intent')
            
            if tour_id:
                try:
                    tour = Tour.objects.get(id=int(tour_id))
                    # Retrieve or create payment record
                    payment, created = Payment.objects.get_or_create(
                        tour=tour,
                        traveler=tour.traveler,
                        defaults={
                            'amount': tour.final_price,
                            'currency': 'USD',
                            'payment_method': 'Stripe',
                            'transaction_id': payment_intent_id or transaction_id
                        }
                    )
                    
                    # Mark successful and verify payment (unlocks tour)
                    payment.status = Payment.Statuses.SUCCESSFUL
                    if payment_intent_id:
                        payment.transaction_id = payment_intent_id
                    payment.raw_response = json.dumps(session)
                    payment.save()
                    payment.verify_payment()  # Dynamically unlocks the tour
                    
                except Tour.DoesNotExist:
                    return Response({"error": "Associated Tour not found."}, status=status.HTTP_404_NOT_FOUND)
                    
        return Response({"status": "success"}, status=status.HTTP_200_OK)


class MockPaymentView(APIView):
    """
    Simulation endpoint for local testing.
    Skips Stripe payment interface and directly transitions Tour status to UNLOCKED.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        tour_id = request.data.get('tour_id')
        if not tour_id:
            return Response({"error": "tour_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            tour = Tour.objects.get(id=tour_id)
        except Tour.DoesNotExist:
            return Response({"error": "Tour not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if tour.traveler != request.user and request.user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return Response({"detail": "You do not have permission to pay for this tour."}, status=status.HTTP_403_FORBIDDEN)
            
        if tour.status != Tour.Status.LOCKED:
            return Response({"error": f"Tour cannot be paid for. Current status is: {tour.status}"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create successful mock payment log
        import uuid
        transaction_id = f"mock_tx_{uuid.uuid4().hex[:12]}"
        
        payment = Payment.objects.create(
            tour=tour,
            traveler=tour.traveler,
            amount=tour.final_price,
            currency='USD',
            status=Payment.Statuses.SUCCESSFUL,
            payment_method='MockSimulator',
            transaction_id=transaction_id,
            raw_response="Simulated Local successful transaction"
        )
        
        payment.verify_payment()  # Transition tour status to UNLOCKED
        
        return Response({
            "message": "Mock payment processed successfully. Tour is now UNLOCKED.",
            "payment": PaymentSerializer(payment).data
        }, status=status.HTTP_200_OK)


class PaymentHistoryListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return Payment.objects.all()
        # Travelers see their own payments history
        return Payment.objects.filter(traveler=user)
