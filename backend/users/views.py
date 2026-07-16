from django.contrib.auth import get_user_model
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import Profile
from users.serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
    ProfileSerializer
)
from notifications.utils import notify_user
from analytics.utils import log_activity

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Simulate sending verification email
        # In production, a verification token/OTP would be dispatched
        print(f"Simulating email verification dispatch to: {user.email}")
        
        return Response({
            "message": "User registered successfully. Please verify your email first.",
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        email = request.query_params.get('email')
        if not email:
            return Response({"error": "Email parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            if user.is_email_verified:
                return Response({"message": "Email is already verified."}, status=status.HTTP_200_OK)
            
            user.is_email_verified = True
            user.save()
            
            # Send Notification
            notify_user(
                user=user,
                title="Email Verified Successfully",
                subject="Account Pending Admin Approval",
                message="Your email has been verified. Your account is now in the queue for Admin approval. We will notify you once approved."
            )
            
            # Log Activity
            log_activity(
                user=user,
                action='EMAIL_VERIFIED',
                details=f"User {user.email} verified email successfully.",
                request=request
            )
            
            return Response({
                "message": "Email verified successfully. Account is now pending Admin Approval.",
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except KeyError:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# Admin user activation views
class PendingApprovalsListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Only Admins and Super Admins can list pending users
        if self.request.user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return User.objects.none()
        return User.objects.filter(status=User.Status.PENDING)


class ApproveUserView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, user_id):
        if request.user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return Response({"detail": "Permission denied. Only admins can approve registration requests."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user_to_approve = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        action = request.data.get('action')  # 'approve' or 'reject'
        if action == 'approve':
            user_to_approve.status = User.Status.APPROVED
            user_to_approve.save()
            
            # Send notification
            notify_user(
                user=user_to_approve,
                title="Account Approved",
                subject="Registration Approved",
                message="Congratulations! Your account has been approved by the Administrator. You can now log in and plan your tours."
            )
            
            # Log Activity
            log_activity(
                user=request.user,
                action='USER_REGISTRATION_APPROVED',
                details=f"Admin approved registration for user: {user_to_approve.email}",
                request=request
            )
            
            return Response({"message": f"User {user_to_approve.email} has been approved successfully."}, status=status.HTTP_200_OK)
        elif action == 'reject':
            user_to_approve.status = User.Status.REJECTED
            user_to_approve.save()
            
            # Send notification
            notify_user(
                user=user_to_approve,
                title="Account Registration Rejected",
                subject="Registration Rejected",
                message="We regret to inform you that your registration request was rejected by an administrator."
            )
            
            # Log Activity
            log_activity(
                user=request.user,
                action='USER_REGISTRATION_REJECTED',
                details=f"Admin rejected registration for user: {user_to_approve.email}",
                request=request
            )
            
            return Response({"message": f"User {user_to_approve.email} registration has been rejected."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid action. Choose 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        profile, created = Profile.objects.get_or_create(user=self.request.user)
        return profile

