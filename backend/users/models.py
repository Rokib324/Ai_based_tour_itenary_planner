from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_email_verified', False)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'SUPER_ADMIN')
        extra_fields.setdefault('status', 'APPROVED')
        extra_fields.setdefault('is_email_verified', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, username, password, **extra_fields)

class User(AbstractUser):
    objects = UserManager()
    class Roles(models.TextChoices):
        ANONYMOUS = 'ANONYMOUS', 'Anonymous User'
        REGISTERED = 'REGISTERED', 'Registered User'
        TRAVELER = 'TRAVELER', 'Traveler'
        ADMIN = 'ADMIN', 'Admin'
        FLIGHT_MANAGER = 'FLIGHT_MANAGER', 'Flight Manager'
        HOTEL_MANAGER = 'HOTEL_MANAGER', 'Hotel Manager'
        RESTAURANT_MANAGER = 'RESTAURANT_MANAGER', 'Restaurant Manager'
        RIDE_MANAGER = 'RIDE_MANAGER', 'Ride Manager'
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Admin Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    role = models.CharField(
        max_length=30,
        choices=Roles.choices,
        default=Roles.REGISTERED
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)

    # Use email as username for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role} - {self.status})"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    
    # Preference parameters for AI Engine
    preferred_budget_tier = models.CharField(
        max_length=20,
        choices=[('BUDGET', 'Budget'), ('STANDARD', 'Standard'), ('LUXURY', 'Luxury')],
        default='STANDARD'
    )
    preferred_travel_style = models.CharField(max_length=50, blank=True, null=True)  # e.g., Adventure, Relaxing, Cultural
    preferred_food = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.email}"


from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)

