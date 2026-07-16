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
            return TourApproval.objects.all()
        if user.role == User.Roles.TRAVELER:
            return TourApproval.objects.filter(tour__traveler=user)
            
        # Managers can see approvals that involve their services
        if user.role == User.Roles.FLIGHT_MANAGER:
            return TourApproval.objects.filter(tour__items__flight__isnull=False).distinct()
        elif user.role == User.Roles.HOTEL_MANAGER:
            return TourApproval.objects.filter(tour__items__hotel__isnull=False).distinct()
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            return TourApproval.objects.filter(tour__items__restaurant__isnull=False).distinct()
        elif user.role == User.Roles.RIDE_MANAGER:
            return TourApproval.objects.filter(tour__items__ride__isnull=False).distinct()
            
        return TourApproval.objects.none()

    @action(detail=False, methods=['get'], url_path='queue')
    def queue(self, request):
        """
        Returns workflows currently waiting for the logged-in manager's action.
        Implements sequential pipeline validation:
        1. Admin review (PENDING)
        2. Flight review (Admin APPROVED, Flight PENDING)
        3. Hotel review (Flight APPROVED/SKIPPED, Hotel PENDING)
        4. Restaurant review (Hotel APPROVED/SKIPPED, Restaurant PENDING)
        5. Ride review (Restaurant APPROVED/SKIPPED, Ride PENDING)
        """
        user = request.user
        queryset = TourApproval.objects.all()

        if user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            # Admins act first
            queryset = queryset.filter(admin_status=ApprovalStatus.PENDING)
            
        elif user.role == User.Roles.FLIGHT_MANAGER:
            # Flight managers act after Admin approvals
            queryset = queryset.filter(
                admin_status=ApprovalStatus.APPROVED,
                flight_status=ApprovalStatus.PENDING
            )
            
        elif user.role == User.Roles.HOTEL_MANAGER:
            # Hotel managers act after flight checkpoint resolves
            queryset = queryset.filter(
                admin_status=ApprovalStatus.APPROVED,
                flight_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                hotel_status=ApprovalStatus.PENDING
            )
            
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            # Restaurant managers act after hotel checkpoint resolves
            queryset = queryset.filter(
                admin_status=ApprovalStatus.APPROVED,
                flight_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                hotel_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                restaurant_status=ApprovalStatus.PENDING
            )
            
        elif user.role == User.Roles.RIDE_MANAGER:
            # Ride managers act after restaurant checkpoint resolves
            queryset = queryset.filter(
                admin_status=ApprovalStatus.APPROVED,
                flight_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                hotel_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                restaurant_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                ride_status=ApprovalStatus.PENDING
            )
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
        if user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            if workflow.admin_status != ApprovalStatus.PENDING:
                return Response({"error": "Admin checkpoint has already been processed."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.admin_status = target_status
            workflow.admin_remarks = comments
            
        # 2. Flight Verification
        elif user.role == User.Roles.FLIGHT_MANAGER:
            if workflow.admin_status != ApprovalStatus.APPROVED:
                return Response({"error": "Cannot action. Awaiting Admin approval first."}, status=status.HTTP_400_BAD_REQUEST)
            if workflow.flight_status != ApprovalStatus.PENDING:
                return Response({"error": "Flight checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.flight_status = target_status
            
            # Log Manager approval action
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.FLIGHT,
                status=target_status,
                comments=comments
            )
            
        # 3. Hotel Verification
        elif user.role == User.Roles.HOTEL_MANAGER:
            if workflow.flight_status not in [ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED] or workflow.admin_status != ApprovalStatus.APPROVED:
                return Response({"error": "Cannot action. Previous checkpoints have not completed."}, status=status.HTTP_400_BAD_REQUEST)
            if workflow.hotel_status != ApprovalStatus.PENDING:
                return Response({"error": "Hotel checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.hotel_status = target_status
            
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.HOTEL,
                status=target_status,
                comments=comments
            )

        # 4. Restaurant Verification
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            if workflow.hotel_status not in [ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED] or workflow.admin_status != ApprovalStatus.APPROVED:
                return Response({"error": "Cannot action. Previous checkpoints have not completed."}, status=status.HTTP_400_BAD_REQUEST)
            if workflow.restaurant_status != ApprovalStatus.PENDING:
                return Response({"error": "Restaurant checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.restaurant_status = target_status
            
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.RESTAURANT,
                status=target_status,
                comments=comments
            )

        # 5. Ride Verification
        elif user.role == User.Roles.RIDE_MANAGER:
            if workflow.restaurant_status not in [ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED] or workflow.admin_status != ApprovalStatus.APPROVED:
                return Response({"error": "Cannot action. Previous checkpoints have not completed."}, status=status.HTTP_400_BAD_REQUEST)
            if workflow.ride_status != ApprovalStatus.PENDING:
                return Response({"error": "Ride checkpoint has already been processed or skipped."}, status=status.HTTP_400_BAD_REQUEST)
            workflow.ride_status = target_status
            
            ManagerApproval.objects.create(
                workflow=workflow,
                manager=user,
                service_type=ManagerApproval.ServiceTypes.RIDE,
                status=target_status,
                comments=comments
            )
        else:
            return Response({"detail": "Permission denied. Travelers cannot review tours."}, status=status.HTTP_403_FORBIDDEN)

        # Trigger decision engine to transition final tour state
        workflow.run_decision_engine()
        
        # Notify the traveler
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
