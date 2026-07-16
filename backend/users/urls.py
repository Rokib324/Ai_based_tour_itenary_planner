from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import (
    RegisterView,
    VerifyEmailView,
    CustomTokenObtainPairView,
    LogoutView,
    PendingApprovalsListView,
    ApproveUserView,
    UserProfileView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('profile/', UserProfileView.as_view(), name='auth_profile'),
    
    # Registration Admin workflows
    path('pending-approvals/', PendingApprovalsListView.as_view(), name='auth_pending_approvals'),
    path('approve/<int:user_id>/', ApproveUserView.as_view(), name='auth_approve_user'),
]
