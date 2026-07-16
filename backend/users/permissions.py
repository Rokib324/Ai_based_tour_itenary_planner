from rest_framework import permissions
from users.models import User

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]
        )


class IsTraveler(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == User.Roles.TRAVELER
        )


class IsFlightManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == User.Roles.FLIGHT_MANAGER
        )


class IsHotelManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == User.Roles.HOTEL_MANAGER
        )


class IsRestaurantManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == User.Roles.RESTAURANT_MANAGER
        )


class IsRideManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == User.Roles.RIDE_MANAGER
        )


class IsAnyServiceManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [
                User.Roles.FLIGHT_MANAGER,
                User.Roles.HOTEL_MANAGER,
                User.Roles.RESTAURANT_MANAGER,
                User.Roles.RIDE_MANAGER
            ]
        )
