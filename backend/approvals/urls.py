from django.urls import path, include
from rest_framework.routers import DefaultRouter
from approvals.views import TourApprovalViewSet

router = DefaultRouter()
router.register('', TourApprovalViewSet, basename='tour-approval')

urlpatterns = [
    path('', include(router.urls)),
]
