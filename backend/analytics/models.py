from django.db import models
from django.conf import settings

class ActivityLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action = models.CharField(max_length=150)
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        user_str = self.user.email if self.user else "Anonymous"
        return f"{user_str} performed '{self.action}' at {self.created_at}"


class ProfitAnalytics(models.Model):
    # Daily or Monthly aggregations for rapid dashboard reporting
    record_date = models.DateField(unique=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    class Meta:
        verbose_name_plural = "Profit Analytics"

    def calculate_margin(self):
        if self.total_revenue > 0:
            self.total_profit = self.total_revenue - self.total_cost
            self.margin_percentage = (self.total_profit / self.total_revenue) * 100
        else:
            self.total_profit = 0.00
            self.margin_percentage = 0.00

    def __str__(self):
        return f"Analytics for {self.record_date} - Revenue: ${self.total_revenue}, Profit: ${self.total_profit}"
