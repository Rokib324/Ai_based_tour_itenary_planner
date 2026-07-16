from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tours.views import (
    FlightServiceViewSet,
    HotelServiceViewSet,
    RestaurantServiceViewSet,
    RideServiceViewSet,
    TourPackageViewSet,
    TourViewSet
)

router = DefaultRouter()
router.register('flights', FlightServiceViewSet, basename='flight-service')
router.register('hotels', HotelServiceViewSet, basename='hotel-service')
router.register('restaurants', RestaurantServiceViewSet, basename='restaurant-service')
router.register('rides', RideServiceViewSet, basename='ride-service')
router.register('packages', TourPackageViewSet, basename='tour-package')
router.register('tours', TourViewSet, basename='tour')

urlpatterns = [
    path('', include(router.urls)),
]
