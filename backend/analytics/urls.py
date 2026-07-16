from django.urls import path
from analytics.views import (
    TravelerDashboardView,
    ManagerDashboardView,
    AdminDashboardView,
    ActivityLogListView,
    ProfitAnalyticsListView
)

urlpatterns = [
    path('dashboard/traveler/', TravelerDashboardView.as_view(), name='dashboard_traveler'),
    path('dashboard/manager/', ManagerDashboardView.as_view(), name='dashboard_manager'),
    path('dashboard/admin/', AdminDashboardView.as_view(), name='dashboard_admin'),
    path('logs/', ActivityLogListView.as_view(), name='activity_logs_list'),
    path('profits/', ProfitAnalyticsListView.as_view(), name='profit_analytics_list'),
]
