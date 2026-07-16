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

    def run_decision_engine(self):
        """
        Decision Engine Logic:
        If admin and all active service checkpoints are approved -> Final status = APPROVED.
        If any checkpoint is rejected -> Final status = REJECTED.
        Otherwise, remain PENDING.
        """
        statuses = [
            self.admin_status,
            self.flight_status,
            self.hotel_status,
            self.restaurant_status,
            self.ride_status
        ]

        if ApprovalStatus.REJECTED in statuses:
            self.decision_engine_status = ApprovalStatus.REJECTED
            self.tour.status = Tour.Status.REJECTED
            
            from notifications.utils import notify_user
            notify_user(
                user=self.tour.traveler,
                title="Tour Plan Rejected",
                subject="Tour Plan Update: Rejected",
                message=f"We regret to inform you that your tour plan '{self.tour.title}' was rejected during approval review."
            )
        elif all(s in [ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED] for s in statuses):
            self.decision_engine_status = ApprovalStatus.APPROVED
            self.tour.status = Tour.Status.LOCKED  # Transition tour to Locked state, awaiting payment
            
            from notifications.utils import notify_user
            notify_user(
                user=self.tour.traveler,
                title="Tour Approved - Payment Required",
                subject="Tour Plan Update: Approved & Locked",
                message=f"Congratulations! Your tour '{self.tour.title}' has been approved by all service managers. Please submit payment to unlock your itinerary."
            )
        else:
            self.decision_engine_status = ApprovalStatus.PENDING
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

    def __str__(self):
        return f"{self.service_type} approval - Status: {self.status} by {self.manager.email if self.manager else 'System'}"
