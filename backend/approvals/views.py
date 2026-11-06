from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.models import User
from approvals.models import TourApproval, ManagerApproval, ApprovalStatus
from approvals.serializers import TourApprovalSerializer, ManagerApprovalSerializer
from tours.models import Tour
from notifications.utils import notify_user
from analytics.utils import log_activity

class TourApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = TourApprovalSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return TourApproval.objects.all().order_by('-created_at')
        if user.role == User.Roles.TRAVELER:
            return TourApproval.objects.filter(tour__traveler=user).order_by('-created_at')
            
        # Managers can see approvals that involve their services
        if user.role == User.Roles.FLIGHT_MANAGER:
            return TourApproval.objects.filter(tour__items__flight__isnull=False).distinct().order_by('-created_at')
        elif user.role == User.Roles.HOTEL_MANAGER:
            return TourApproval.objects.filter(tour__items__hotel__isnull=False).distinct().order_by('-created_at')
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            return TourApproval.objects.filter(tour__items__restaurant__isnull=False).distinct().order_by('-created_at')
        elif user.role == User.Roles.RIDE_MANAGER:
            return TourApproval.objects.filter(tour__items__ride__isnull=False).distinct().order_by('-created_at')
            
        return TourApproval.objects.none()

    @action(detail=False, methods=['get'], url_path='queue')
    def queue(self, request):
        """
        Returns workflows currently waiting for the logged-in manager's action.
        Managers review their respective service checkpoint when it is PENDING.
        """
        user = request.user
        queryset = TourApproval.objects.exclude(tour__status__in=[Tour.Status.REJECTED, Tour.Status.COMPLETED]).order_by('-created_at')

        if user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            queryset = queryset.filter(admin_status=ApprovalStatus.PENDING)
            
        elif user.role == User.Roles.FLIGHT_MANAGER:
            queryset = queryset.filter(flight_status=ApprovalStatus.PENDING)
            
        elif user.role == User.Roles.HOTEL_MANAGER:
            queryset = queryset.filter(hotel_status=ApprovalStatus.PENDING)
            
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            queryset = queryset.filter(restaurant_status=ApprovalStatus.PENDING)
            
        elif user.role == User.Roles.RIDE_MANAGER:
            queryset = queryset.filter(ride_status=ApprovalStatus.PENDING)
        else:
            return Response({"detail": "Travelers do not have a review queue."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='action')
    def process_action(self, request, pk=None):
        """
        Executes approval checkpoint action (APPROVE or REJECT).
        Body: {"status": "APPROVED"/"REJECTED", "comments": "string"}
        """
        workflow = self.get_object()
        user = request.user
        
        target_status = request.data.get('status')
        comments = request.data.get('comments', '')
        
        if target_status not in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]:
            return Response({"error": "Invalid status. Must be APPROVED or REJECTED."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Admin Verification
        service_type = None
        service_display = None
        rejected_item = None

        if user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            if workflow.admin_status != ApprovalStatus.PENDING:
                return Response({"error": "Admin checkpoint has already been processed."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.admin_status = target_status
            workflow.admin_remarks = comments
            service_display = "Administrative Checkpoint"
            
        # 2. Flight Verification
        elif user.role == User.Roles.FLIGHT_MANAGER:
            if workflow.flight_status != ApprovalStatus.PENDING:
                return Response({"error": "Flight checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.flight_status = target_status
            service_type = 'FLIGHT'
            service_display = 'Flight Service'
            rejected_item = workflow.tour.items.filter(flight__isnull=False).first()
            
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.FLIGHT,
                status=target_status,
                comments=comments
            )
            
        # 3. Hotel Verification
        elif user.role == User.Roles.HOTEL_MANAGER:
            if workflow.hotel_status != ApprovalStatus.PENDING:
                return Response({"error": "Hotel checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.hotel_status = target_status
            service_type = 'HOTEL'
            service_display = 'Hotel Service'
            rejected_item = workflow.tour.items.filter(hotel__isnull=False).first()
            
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.HOTEL,
                status=target_status,
                comments=comments
            )

        # 4. Restaurant Verification
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            if workflow.restaurant_status != ApprovalStatus.PENDING:
                return Response({"error": "Restaurant checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.restaurant_status = target_status
            service_type = 'RESTAURANT'
            service_display = 'Dining Service'
            rejected_item = workflow.tour.items.filter(restaurant__isnull=False).first()
            
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.RESTAURANT,
                status=target_status,
                comments=comments
            )

        # 5. Ride Verification
        elif user.role == User.Roles.RIDE_MANAGER:
            if workflow.ride_status != ApprovalStatus.PENDING:
                return Response({"error": "Ride checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.ride_status = target_status
            service_type = 'RIDE'
            service_display = 'Ride / Transport Service'
            rejected_item = workflow.tour.items.filter(ride__isnull=False).first()
            
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.RIDE,
                status=target_status,
                comments=comments
            )
        else:
            return Response({"detail": "Permission denied. Travelers cannot review tours."}, status=status.HTTP_403_FORBIDDEN)

        # Handle Service Rejection & Automatic Refund if tour was already paid
        refund_record = None
        refund_amount = 0.0
        if target_status == ApprovalStatus.REJECTED and service_type:
            from payments.models import Payment, Refund
            paid_payments = workflow.tour.payments.filter(status=Payment.Statuses.SUCCESSFUL)
            if paid_payments.exists() and rejected_item:
                cost = 0.0
                if rejected_item.flight:
                    cost = float(rejected_item.flight.price)
                elif rejected_item.hotel:
                    cost = float(rejected_item.hotel.price_per_night * rejected_item.quantity)
                elif rejected_item.restaurant:
                    cost = float(rejected_item.restaurant.price_per_meal * rejected_item.quantity)
                elif rejected_item.ride:
                    cost = float(rejected_item.ride.price_per_km * rejected_item.quantity)
                elif rejected_item.is_custom_provided:
                    cost = float(rejected_item.custom_cost)

                markup = float(workflow.tour.markup_percentage or 25.0)
                refund_amount = round(cost * (1.0 + markup / 100.0), 2)
                last_payment = paid_payments.order_by('-created_at').first()

                if refund_amount > 0:
                    item_name = "Service"
                    if rejected_item.flight:
                        item_name = f"Flight: {rejected_item.flight.name}"
                    elif rejected_item.hotel:
                        item_name = f"Hotel: {rejected_item.hotel.name}"
                    elif rejected_item.restaurant:
                        item_name = f"Restaurant: {rejected_item.restaurant.name}"
                    elif rejected_item.ride:
                        item_name = f"Ride: {rejected_item.ride.vehicle_type}"

                    refund_record = Refund.objects.create(
                        tour=workflow.tour,
                        traveler=workflow.tour.traveler,
                        payment=last_payment,
                        service_type=service_type,
                        service_name=item_name,
                        amount=refund_amount,
                        reason=comments or 'Provider declined service request',
                        status=Refund.Statuses.COMPLETED
                    )

        # Trigger decision engine to transition tour state
        workflow.run_decision_engine()
        
        # Notify the traveler with context-rich feedback
        if target_status == ApprovalStatus.REJECTED and service_type:
            if refund_record:
                notice = (
                    f"The {service_display} for your tour '{workflow.tour.title}' was declined by the provider. "
                    f"Reason: {comments or 'Service unavailable'}. "
                    f"Your tour is still active! A refund of ${refund_amount:.2f} has been processed back to your payment method. "
                    f"You can now choose a custom or alternative provider in your dashboard."
                )
            else:
                notice = (
                    f"The {service_display} for your tour '{workflow.tour.title}' was declined by the provider. "
                    f"Reason: {comments or 'Service unavailable'}. "
                    f"Your tour is still active and visible to other providers! "
                    f"You can choose an alternative or custom provider in your dashboard, and your price will adjust automatically."
                )
            notify_user(
                user=workflow.tour.traveler,
                title=f"{service_display} Declined — Tour Still Active",
                subject=f"Service Update: {service_display} Declined",
                message=notice
            )
        else:
            notify_user(
                user=workflow.tour.traveler,
                title="Tour Checkpoint Update",
                subject=f"Tour Checkpoint Update: {target_status}",
                message=f"A checkpoint on your tour '{workflow.tour.title}' was updated to: {target_status} by a system reviewer. Comments: {comments}"
            )
        
        # Log Activity
        log_activity(
            user=user,
            action='TOUR_CHECKPOINT_PROCESSED',
            details=f"Reviewer ({user.role}) marked checkpoint status as '{target_status}' on tour '{workflow.tour.title}' (Workflow ID: {workflow.id}). Remarks: {comments}",
            request=request
        )
        
        return Response({
            "message": "Checkpoint action processed successfully.",
            "workflow": TourApprovalSerializer(workflow).data
        }, status=status.HTTP_200_OK)
