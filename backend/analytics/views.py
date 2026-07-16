from django.db.models import Sum, Count
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from users.models import User
from tours.models import Tour, TourItem, FlightService, HotelService, RestaurantService, RideService
from payments.models import Payment
from approvals.models import TourApproval, ApprovalStatus
from notifications.models import InAppNotification
from analytics.models import ActivityLog
from tours.ai_engine import AIEngine

class TravelerDashboardView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        if user.role != User.Roles.TRAVELER and user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        tours = Tour.objects.filter(traveler=user)
        payments = Payment.objects.filter(traveler=user)
        notifications = InAppNotification.objects.filter(user=user, is_read=False)[:5]
        
        # Summary counts
        tours_count = tours.count()
        pending_count = tours.filter(status=Tour.Status.PENDING).count()
        locked_count = tours.filter(status=Tour.Status.LOCKED).count()
        unlocked_count = tours.filter(status=Tour.Status.UNLOCKED).count()
        completed_count = tours.filter(status=Tour.Status.COMPLETED).count()
        
        # Financial sum (amount spent on successful checkouts)
        total_spent = payments.filter(status=Payment.Statuses.SUCCESSFUL).aggregate(total=Sum('amount'))['total'] or 0.00
        
        # Upcoming tour details and weather
        upcoming_tour = tours.filter(status__in=[Tour.Status.UNLOCKED, Tour.Status.LOCKED]).order_by('start_date').first()
        weather_info = None
        if upcoming_tour:
            # Determine destination for weather lookup
            destination = "Dhaka"
            hotel_item = upcoming_tour.items.filter(hotel__isnull=False).first()
            if hotel_item and hotel_item.hotel:
                destination = hotel_item.hotel.location
            elif upcoming_tour.package:
                destination = upcoming_tour.package.destination
                
            ai = AIEngine()
            weather_info = ai.get_weather_recommendations(destination)
            weather_info['destination'] = destination

        # Recent 5 tours serialization skeleton
        recent_tours = []
        for t in tours.order_by('-created_at')[:5]:
            recent_tours.append({
                'id': t.id,
                'title': t.title,
                'status': t.status,
                'budget_tier': t.budget_tier,
                'final_price': float(t.final_price),
                'start_date': t.start_date,
                'end_date': t.end_date
            })

        recent_payments = []
        for p in payments.order_by('-created_at')[:5]:
            recent_payments.append({
                'id': p.id,
                'tour_title': p.tour.title,
                'amount': float(p.amount),
                'status': p.status,
                'payment_method': p.payment_method,
                'created_at': p.created_at
            })

        recent_notifs = []
        for n in notifications:
            recent_notifs.append({
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'created_at': n.created_at
            })

        return Response({
            "metrics": {
                "total_tours": tours_count,
                "pending_tours": pending_count,
                "locked_tours": locked_count,
                "unlocked_tours": unlocked_count,
                "completed_tours": completed_count,
                "total_spent": float(total_spent)
            },
            "upcoming_tour": {
                "id": upcoming_tour.id,
                "title": upcoming_tour.title,
                "start_date": upcoming_tour.start_date,
                "status": upcoming_tour.status,
                "weather": weather_info
            } if upcoming_tour else None,
            "recent_tours": recent_tours,
            "recent_payments": recent_payments,
            "unread_notifications": recent_notifs
        }, status=status.HTTP_200_OK)


class ManagerDashboardView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        
        # Verify manager role
        manager_roles = [
            User.Roles.FLIGHT_MANAGER, 
            User.Roles.HOTEL_MANAGER, 
            User.Roles.RESTAURANT_MANAGER, 
            User.Roles.RIDE_MANAGER
        ]
        if user.role not in manager_roles and user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        # Count pending queue items for approvals
        from approvals.views import TourApprovalViewSet
        # Instantiate approval viewset to reuse its custom queue filtering
        # Or query directly based on role
        queue_count = 0
        workflows = TourApproval.objects.all()
        
        if user.role == User.Roles.FLIGHT_MANAGER:
            queue_count = workflows.filter(admin_status=ApprovalStatus.APPROVED, flight_status=ApprovalStatus.PENDING).count()
            inventory_items = FlightService.objects.filter(manager=user)
        elif user.role == User.Roles.HOTEL_MANAGER:
            queue_count = workflows.filter(
                admin_status=ApprovalStatus.APPROVED,
                flight_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                hotel_status=ApprovalStatus.PENDING
            ).count()
            inventory_items = HotelService.objects.filter(manager=user)
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            queue_count = workflows.filter(
                admin_status=ApprovalStatus.APPROVED,
                flight_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                hotel_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                restaurant_status=ApprovalStatus.PENDING
            ).count()
            inventory_items = RestaurantService.objects.filter(manager=user)
        elif user.role == User.Roles.RIDE_MANAGER:
            queue_count = workflows.filter(
                admin_status=ApprovalStatus.APPROVED,
                flight_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                hotel_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                restaurant_status__in=[ApprovalStatus.APPROVED, ApprovalStatus.SKIPPED],
                ride_status=ApprovalStatus.PENDING
            ).count()
            inventory_items = RideService.objects.filter(manager=user)
        else:
            inventory_items = []

        # Serialize inventory items managed by this user
        serialized_inventory = []
        for item in inventory_items[:10]:
            item_details = {
                'id': item.id,
                'name': getattr(item, 'name', getattr(item, 'vehicle_type', 'Service')),
                'is_available': item.is_available
            }
            if hasattr(item, 'price'):
                item_details['price'] = float(item.price)
            elif hasattr(item, 'price_per_night'):
                item_details['price'] = float(item.price_per_night)
            elif hasattr(item, 'price_per_meal'):
                item_details['price'] = float(item.price_per_meal)
            elif hasattr(item, 'price_per_km'):
                item_details['price'] = float(item.price_per_km)
            serialized_inventory.append(item_details)

        return Response({
            "role": user.role,
            "metrics": {
                "assigned_requests_count": queue_count,
                "total_managed_services": inventory_items.count() if hasattr(inventory_items, 'count') else len(inventory_items)
            },
            "recent_inventory": serialized_inventory
        }, status=status.HTTP_200_OK)


class AdminDashboardView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        if user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return Response({"detail": "Permission denied. Admin role required."}, status=status.HTTP_403_FORBIDDEN)
            
        # 1. Total registrations & pending registrations
        total_users = User.objects.count()
        pending_registrations = User.objects.filter(status=User.Status.PENDING, is_email_verified=True).count()
        
        # 2. Tour Metrics
        total_tours = Tour.objects.count()
        pending_workflows = TourApproval.objects.filter(decision_engine_status=ApprovalStatus.PENDING).count()
        
        # 3. Revenue & Profit Analytics
        # Only aggregate paid tours (UNLOCKED or COMPLETED)
        paid_tours = Tour.objects.filter(status__in=[Tour.Status.UNLOCKED, Tour.Status.COMPLETED])
        total_revenue = paid_tours.aggregate(rev=Sum('final_price'))['rev'] or 0.00
        total_base_cost = paid_tours.aggregate(cost=Sum('base_cost'))['cost'] or 0.00
        total_profit = total_revenue - total_base_cost
        
        # 4. Recent activity logs
        recent_logs = []
        for log in ActivityLog.objects.all()[:10]:
            recent_logs.append({
                'id': log.id,
                'user_email': log.user.email if log.user else 'Anonymous',
                'action': log.action,
                'details': log.details,
                'created_at': log.created_at
            })

        # 5. Recent system payments
        recent_payments = []
        for p in Payment.objects.order_by('-created_at')[:5]:
            recent_payments.append({
                'id': p.id,
                'traveler_email': p.traveler.email,
                'amount': float(p.amount),
                'status': p.status,
                'payment_method': p.payment_method,
                'created_at': p.created_at
            })

        return Response({
            "metrics": {
                "total_users": total_users,
                "pending_registrations": pending_registrations,
                "total_tours": total_tours,
                "pending_approvals": pending_workflows
            },
            "financials": {
                "total_revenue": float(total_revenue),
                "total_base_cost": float(total_base_cost),
                "total_profit": float(total_profit),
                "profit_margin_percent": round(float((total_profit / total_revenue) * 100), 2) if total_revenue > 0 else 0.00
            },
            "recent_payments": recent_payments,
            "recent_activity_logs": recent_logs
        }, status=status.HTTP_200_OK)


from rest_framework import generics
from analytics.serializers import ActivityLogSerializer, ProfitAnalyticsSerializer
from analytics.models import ActivityLog, ProfitAnalytics

class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return ActivityLog.objects.none()
        return ActivityLog.objects.all().order_by('-created_at')


class ProfitAnalyticsListView(generics.ListAPIView):
    serializer_class = ProfitAnalyticsSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if user.role not in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
            return ProfitAnalytics.objects.none()
        return ProfitAnalytics.objects.all().order_by('-record_date')
