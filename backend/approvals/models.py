from django.db import models
from django.conf import settings
from tours.models import Tour

class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    SKIPPED = 'SKIPPED', 'Skipped'  # In case a custom tour doesn't contain a specific service


class TourApproval(models.Model):
    tour = models.OneToOneField(Tour, on_delete=models.CASCADE, related_name='approval_workflow')
    
    # Sequential checkpoints statuses
    admin_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    flight_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    hotel_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    restaurant_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    ride_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    
    # Final outcome status of decision engine
    decision_engine_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    
    admin_remarks = models.TextField(blank=True, null=True)
    decision_remarks = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['decision_engine_status']),
        ]

    def run_decision_engine(self):
        """
        Decision Engine Logic:
        1. If admin rejects -> Tour status = REJECTED (Admin global veto).
        2. If all active service checkpoints (Flight, Hotel, Restaurant, Ride) are approved/skipped
           and admin has not rejected -> Tour status = LOCKED (ready for payment).
        3. If an individual service provider rejects:
           - The tour itself is NOT rejected!
           - Tour remains active (PENDING) so other managers can review their checkpoints,
             and the traveler can choose a custom/alternative provider or receive a refund.
        """
        service_statuses = [
            self.flight_status,
            self.hotel_status,
            self.restaurant_status,
            self.ride_status
        ]

        # 1. Admin explicit rejection
        if self.admin_status == ApprovalStatus.REJECTED:
            self.decision_engine_status = ApprovalStatus.REJECTED
            self.tour.status = Tour.Status.REJECTED
            
            from notifications.utils import notify_user
            notify_user(
                user=self.tour.traveler,
                title="Tour Plan Rejected by Admin",
                subject="Tour Plan Update: Rejected",
                message=f"Your tour plan '{self.tour.title}' was rejected during administrative review. Remarks: {self.admin_remarks or 'No remarks provided.'}"
            )
        # 2. All active services approved or skipped
        elif all(s in [ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED] for s in service_statuses):
            self.admin_status = ApprovalStatus.APPROVED
            self.decision_engine_status = ApprovalStatus.APPROVED
            if self.tour.status == Tour.Status.PENDING:
                self.tour.status = Tour.Status.LOCKED  # Transition tour to Locked state, awaiting payment
            
            from notifications.utils import notify_user
            notify_user(
                user=self.tour.traveler,
                title="Tour Approved - Payment Required",
                subject="Tour Plan Update: Approved & Locked",
                message=f"Congratulations! All services on your tour '{self.tour.title}' have been approved. Please submit payment to unlock your itinerary."
            )
        # 3. Ongoing or partially rejected service - tour remains active
        else:
            self.decision_engine_status = ApprovalStatus.PENDING
            if self.tour.status == Tour.Status.REJECTED:
                # Recover tour if it was previously marked rejected by an individual service provider
                self.tour.status = Tour.Status.PENDING

        self.tour.save()
        self.save()

    def __str__(self):
        return f"Workflow of Tour: {self.tour.title} (Engine: {self.decision_engine_status})"


class ManagerApproval(models.Model):
    class ServiceTypes(models.TextChoices):
        FLIGHT = 'FLIGHT', 'Flight'
        HOTEL = 'HOTEL', 'Hotel'
        RESTAURANT = 'RESTAURANT', 'Restaurant'
        RIDE = 'RIDE', 'Ride'

    workflow = models.ForeignKey(TourApproval, on_delete=models.CASCADE, related_name='manager_logs')
    manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    service_type = models.CharField(max_length=20, choices=ServiceTypes.choices)
    status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    comments = models.TextField(blank=True, null=True)
    actioned_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-actioned_at']
        indexes = [
            models.Index(fields=['-actioned_at']),
            models.Index(fields=['status', 'service_type']),
        ]

    def __str__(self):
        return f"{self.service_type} approval - Status: {self.status} by {self.manager.email if self.manager else 'System'}"
