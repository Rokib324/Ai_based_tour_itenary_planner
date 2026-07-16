from django.db import models
from django.conf import settings
from tours.models import Tour

class Payment(models.Model):
    class Statuses(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESSFUL = 'SUCCESSFUL', 'Successful'
        FAILED = 'FAILED', 'Failed'

    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='payments')
    traveler = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    status = models.CharField(max_length=20, choices=Statuses.choices, default=Statuses.PENDING)
    
    payment_method = models.CharField(max_length=50, default='Stripe')  # e.g., Stripe, SSLCommerz
    transaction_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    raw_response = models.TextField(blank=True, null=True)  # Raw payload from Stripe for logging
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def verify_payment(self):
        """
        Unlocks the associated tour upon successful payment verification.
        """
        if self.status == self.Statuses.SUCCESSFUL:
            self.tour.status = Tour.Status.UNLOCKED
            self.tour.save()
            
            from notifications.utils import notify_user
            notify_user(
                user=self.traveler,
                title="Tour Unlocked",
                subject="Payment Confirmed: Tour Unlocked",
                message=f"Payment of ${self.amount} was confirmed. Your tour '{self.tour.title}' has been successfully UNLOCKED for travel."
            )

            # Rebuild daily ProfitAnalytics aggregation
            import datetime
            from django.db.models import Sum
            from analytics.models import ProfitAnalytics
            from analytics.utils import log_activity

            payment_date = self.created_at.date() if self.created_at else datetime.date.today()
            paid_tours_today = Tour.objects.filter(
                status__in=[Tour.Status.UNLOCKED, Tour.Status.COMPLETED],
                payments__status=self.Statuses.SUCCESSFUL,
                payments__created_at__date=payment_date
            ).distinct()

            total_rev = paid_tours_today.aggregate(rev=Sum('final_price'))['rev'] or 0.00
            total_cost = paid_tours_today.aggregate(cost=Sum('base_cost'))['cost'] or 0.00
            total_prof = total_rev - total_cost

            margin = 0.00
            if total_rev > 0:
                margin = (total_prof / total_rev) * 100

            analytics_record, created = ProfitAnalytics.objects.get_or_create(record_date=payment_date)
            analytics_record.total_revenue = total_rev
            analytics_record.total_cost = total_cost
            analytics_record.total_profit = total_prof
            analytics_record.margin_percentage = margin
            analytics_record.save()

            # Log Activity
            log_activity(
                user=self.traveler,
                action='TOUR_PAYMENT_SUCCESSFUL',
                details=f"Payment of ${self.amount} processed successfully for Tour '{self.tour.title}'. Transaction ID: {self.transaction_id}."
            )

    def __str__(self):
        return f"Payment {self.transaction_id or self.id} - Tour {self.tour_id} - {self.status}"
