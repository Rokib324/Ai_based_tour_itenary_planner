from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from users.models import Profile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'status')


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    username = serializers.CharField(source='user.username', required=False)

    class Meta:
        model = Profile
        fields = (
            'id', 'user', 'username', 'full_name', 'bio', 'avatar_url',
            'phone_number', 'address', 'city', 'country',
            'preferred_budget_tier', 'preferred_travel_style', 'preferred_food', 'preferred_transport'
        )

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        username = user_data.get('username')
        if username:
            instance.user.username = username
            instance.user.save()
        return super().update(instance, validated_data)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    phone_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password_confirm', 'role', 'phone_number', 'address')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        phone_number = validated_data.pop('phone_number', '')
        address = validated_data.pop('address', '')
        
        # Determine initial user status:
        # Traveler role is auto-approved on registration. Service managers require Admin approval.
        user_role = validated_data.get('role', User.Roles.TRAVELER)
        if user_role in [User.Roles.TRAVELER, 'TRAVELER']:
            status = User.Status.APPROVED
        else:
            status = User.Status.PENDING
        
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            role=user_role,
            status=status,
            is_active=True
        )
        
        # Profile is created automatically by post_save signal
        profile = user.profile
        profile.phone_number = phone_number
        profile.address = address
        profile.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Perform standard validation first
        data = super().validate(attrs)
        
        # Check approval status
        if self.user.status == User.Status.REJECTED:
            raise AuthenticationFailed(
                "Your account registration was rejected by an administrator.",
                code="account_rejected"
            )
            
        # Add extra info to return payload
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'username': self.user.username,
            'role': self.user.role,
            'status': self.user.status
        }
        return data
