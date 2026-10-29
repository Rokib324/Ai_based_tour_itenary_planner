from django.contrib.auth import get_user_model
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import Profile, PasswordResetOTP
from users.serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
    ProfileSerializer
)
from notifications.utils import notify_user
from analytics.utils import log_activity
from django.core.mail import send_mail
from django.conf import settings

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


class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not old_password or not new_password or not confirm_password:
            return Response({"error": "All password fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({"error": "New passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({"error": "New password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        # Log Activity
        log_activity(
            user=user,
            action='PASSWORD_CHANGED',
            details=f"User {user.email} updated their account password.",
            request=request
        )

        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Forgot Password — Step 1: Request OTP via email
# ─────────────────────────────────────────────────────────────────────────────
class ForgotPasswordRequestView(APIView):
    """
    POST /api/v1/auth/forgot-password/request/
    Body: { "email": "user@example.com" }

    Generates a 6-digit OTP valid for 10 minutes and sends it to the user's
    registered email address via SMTP (or console in DEBUG mode).
    Always returns HTTP 200 to avoid user-enumeration attacks.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response(
                {"error": "Email address is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Do NOT reveal that the email does not exist
            return Response(
                {"message": "If that email is registered, an OTP has been sent."},
                status=status.HTTP_200_OK
            )

        # Generate OTP (invalidates any previously unused OTPs for this user)
        otp_obj = PasswordResetOTP.generate_for(user)

        subject = "SmartTravel — Your Password Reset OTP"
        message = (
            f"Hi {user.username},\n\n"
            f"You requested a password reset for your SmartTravel account.\n\n"
            f"Your One-Time Password (OTP) is:\n\n"
            f"    {otp_obj.otp}\n\n"
            f"This OTP is valid for {PasswordResetOTP.OTP_VALIDITY_MINUTES} minutes.\n"
            f"If you did not request this, you can safely ignore this email.\n\n"
            f"— The SmartTravel Team"
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as exc:
            import logging
            logging.error(f"OTP email failed for {user.email}: {exc}")
            # In production you'd return 500; in dev we still return 200 so
            # the developer can check the console backend.

        # Log activity
        log_activity(
            user=user,
            action='PASSWORD_RESET_REQUESTED',
            details=f"Password reset OTP dispatched to {user.email}.",
            request=request
        )

        return Response(
            {"message": "If that email is registered, an OTP has been sent."},
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────────────────────────────────────
# Forgot Password — Step 2: Verify OTP
# ─────────────────────────────────────────────────────────────────────────────
class ForgotPasswordVerifyOTPView(APIView):
    """
    POST /api/v1/auth/forgot-password/verify-otp/
    Body: { "email": "user@example.com", "otp": "123456" }

    Validates the OTP and returns a short-lived reset_token (the OTP id encoded
    in the response) that the frontend must pass when submitting the new password.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp_code = request.data.get('otp', '').strip()

        if not email or not otp_code:
            return Response(
                {"error": "Email and OTP are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the most recent unused OTP for this user
        otp_obj = (
            PasswordResetOTP.objects
            .filter(user=user, otp=otp_code, is_used=False)
            .order_by('-created_at')
            .first()
        )

        if otp_obj is None or not otp_obj.is_valid():
            return Response(
                {"error": "Invalid or expired OTP. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # We do NOT mark it used yet — that happens when the password is set.
        # Return the OTP id as a reset_token so Step 3 can reference it.
        return Response(
            {
                "message": "OTP verified. Proceed to set your new password.",
                "reset_token": otp_obj.id,  # opaque id, frontend stores it temporarily
            },
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────────────────────────────────────
# Forgot Password — Step 3: Set new password
# ─────────────────────────────────────────────────────────────────────────────
class ForgotPasswordResetView(APIView):
    """
    POST /api/v1/auth/forgot-password/reset/
    Body: {
        "email": "user@example.com",
        "reset_token": <otp_id from Step 2>,
        "new_password": "...",
        "confirm_password": "..."
    }

    Completes the password reset, invalidates the OTP and sends a confirmation
    email.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email          = request.data.get('email', '').strip().lower()
        reset_token    = request.data.get('reset_token')
        new_password   = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not all([email, reset_token, new_password, confirm_password]):
            return Response(
                {"error": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {"error": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid request."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            otp_obj = PasswordResetOTP.objects.get(id=reset_token, user=user, is_used=False)
        except PasswordResetOTP.DoesNotExist:
            return Response(
                {"error": "Invalid or expired reset token. Please start over."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not otp_obj.is_valid():
            return Response(
                {"error": "Reset token has expired. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password and invalidate OTP
        user.set_password(new_password)
        user.save()
        otp_obj.is_used = True
        otp_obj.save()

        # Confirmation email
        try:
            send_mail(
                subject="SmartTravel — Password Changed Successfully",
                message=(
                    f"Hi {user.username},\n\n"
                    f"Your SmartTravel account password has been changed successfully.\n\n"
                    f"If you did not make this change, please contact support immediately.\n\n"
                    f"— The SmartTravel Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        # Log activity
        log_activity(
            user=user,
            action='PASSWORD_RESET_COMPLETED',
            details=f"Password reset completed for {user.email} via OTP flow.",
            request=request
        )

        return Response(
            {"message": "Password has been reset successfully. You can now log in with your new password."},
            status=status.HTTP_200_OK
        )

