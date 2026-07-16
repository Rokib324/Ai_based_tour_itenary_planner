from django.urls import path
from notifications.views import NotificationListView, MarkNotificationReadView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('<int:pk>/read/', MarkNotificationReadView.as_view(), name='notification_mark_read'),
]
