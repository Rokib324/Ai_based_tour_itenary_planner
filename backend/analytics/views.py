from django.db import models
from django.db.models import Sum, Count
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from users.models import User
from tours.models import Tour, TourItem, FlightService, HotelService, RestaurantService, RideService
from payments.models import Payment
from approvals.models import TourApproval, ManagerApproval, ApprovalStatus
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
            
        # Determine service domain field and service type
        if user.role == User.Roles.FLIGHT_MANAGER:
            status_field = 'flight_status'
            service_type = ManagerApproval.ServiceTypes.FLIGHT
            inventory_items = FlightService.objects.filter(manager=user).order_by('-created_at')
        elif user.role == User.Roles.HOTEL_MANAGER:
            status_field = 'hotel_status'
            service_type = ManagerApproval.ServiceTypes.HOTEL
            inventory_items = HotelService.objects.filter(manager=user).order_by('-created_at')
        elif user.role == User.Roles.RESTAURANT_MANAGER:
            status_field = 'restaurant_status'
            service_type = ManagerApproval.ServiceTypes.RESTAURANT
            inventory_items = RestaurantService.objects.filter(manager=user).order_by('-created_at')
        elif user.role == User.Roles.RIDE_MANAGER:
            status_field = 'ride_status'
            service_type = ManagerApproval.ServiceTypes.RIDE
            inventory_items = RideService.objects.filter(manager=user).order_by('-created_at')
        else: # Admin / SuperAdmin
            status_field = 'admin_status'
            service_type = None
            inventory_items = []

        workflows = TourApproval.objects.all()
        active_workflows = workflows.exclude(tour__status__in=[Tour.Status.REJECTED, Tour.Status.COMPLETED])
        
        # 1. KPI Counts
        queue_count = active_workflows.filter(**{status_field: ApprovalStatus.PENDING}).count()
        approved_workflows = workflows.filter(**{status_field: ApprovalStatus.APPROVED})
        rejected_workflows = workflows.filter(**{status_field: ApprovalStatus.REJECTED})
        
        total_approved = approved_workflows.count()
        total_rejected = rejected_workflows.count()
        total_decisions = total_approved + total_rejected
        approval_rate = round((total_approved / total_decisions) * 100.0, 1) if total_decisions > 0 else 100.0

        # Helper to extract service details and income for this manager's role
        def get_tour_service_info(tour, role):
            item_title = "Service"
            item_desc = "Standard"
            income = 0.0

            if role == User.Roles.FLIGHT_MANAGER:
                item = tour.items.filter(flight__isnull=False).first()
                if item and item.flight:
                    item_title = f"{item.flight.name} ({item.flight.flight_number})"
                    item_desc = f"{item.flight.departure_city} → {item.flight.destination_city}"
                    income = float(item.flight.price)
                elif tour.items.filter(is_custom_provided=True, custom_service_type='FLIGHT').exists():
                    c_item = tour.items.filter(is_custom_provided=True, custom_service_type='FLIGHT').first()
                    item_title = f"Custom: {c_item.custom_provider_name}"
                    item_desc = c_item.custom_details or "Self-arranged"
                    income = float(c_item.custom_cost)

            elif role == User.Roles.HOTEL_MANAGER:
                item = tour.items.filter(hotel__isnull=False).first()
                if item and item.hotel:
                    nights = item.quantity or 1
                    item_title = item.hotel.name
                    item_desc = f"{item.hotel.location} • {item.hotel.room_type} ({nights} nights)"
                    income = float(item.hotel.price_per_night * nights)
                elif tour.items.filter(is_custom_provided=True, custom_service_type='HOTEL').exists():
                    c_item = tour.items.filter(is_custom_provided=True, custom_service_type='HOTEL').first()
                    item_title = f"Custom: {c_item.custom_provider_name}"
                    item_desc = c_item.custom_details or "Self-arranged"
                    income = float(c_item.custom_cost)

            elif role == User.Roles.RESTAURANT_MANAGER:
                item = tour.items.filter(restaurant__isnull=False).first()
                if item and item.restaurant:
                    meals = item.quantity or 1
                    item_title = item.restaurant.name
                    item_desc = f"{item.restaurant.location} • {item.restaurant.cuisine} ({meals} meals)"
                    income = float(item.restaurant.price_per_meal * meals)
                elif tour.items.filter(is_custom_provided=True, custom_service_type='RESTAURANT').exists():
                    c_item = tour.items.filter(is_custom_provided=True, custom_service_type='RESTAURANT').first()
                    item_title = f"Custom: {c_item.custom_provider_name}"
                    item_desc = c_item.custom_details or "Self-arranged"
                    income = float(c_item.custom_cost)

            elif role == User.Roles.RIDE_MANAGER:
                item = tour.items.filter(ride__isnull=False).first()
                if item and item.ride:
                    km = item.quantity or 1
                    item_title = f"{item.ride.vehicle_type} by {item.ride.provider_name}"
                    item_desc = f"{item.ride.location} • {km} km"
                    income = float(item.ride.price_per_km * km)
                elif tour.items.filter(is_custom_provided=True, custom_service_type='RIDE').exists():
                    c_item = tour.items.filter(is_custom_provided=True, custom_service_type='RIDE').first()
                    item_title = f"Custom: {c_item.custom_provider_name}"
                    item_desc = c_item.custom_details or "Self-arranged"
                    income = float(c_item.custom_cost)

            elif role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN]:
                item_title = f"Tour: {tour.title}"
                item_desc = f"{tour.budget_tier} Tier • {tour.start_date} to {tour.end_date}"
                income = float(tour.final_price)

            return item_title, item_desc, income

        # 2. Income Calculations
        from payments.models import Payment
        estimated_income = 0.0  # Approved tours awaiting payment / in pipeline
        total_income_alltime = 0.0  # Approved tours that have been paid/unlocked

        for wf in approved_workflows:
            tour = wf.tour
            _, _, price = get_tour_service_info(tour, user.role)
            is_paid = (
                tour.status in [Tour.Status.UNLOCKED, Tour.Status.COMPLETED] or
                tour.payments.filter(status=Payment.Statuses.SUCCESSFUL).exists()
            )
            if is_paid:
                total_income_alltime += price
            else:
                estimated_income += price

        total_pipeline_value = estimated_income + total_income_alltime
        avg_revenue = round(total_pipeline_value / total_approved, 2) if total_approved > 0 else 0.0

        # 3. Decision History Table Records
        decision_history = []
        actioned_tour_ids = set()

        logs_query = ManagerApproval.objects.all().order_by('-actioned_at')
        if service_type:
            logs_query = logs_query.filter(models.Q(manager=user) | models.Q(service_type=service_type))

        for log in logs_query:
            wf = log.workflow
            tour = wf.tour
            actioned_tour_ids.add(tour.id)
            title, desc, price = get_tour_service_info(tour, user.role)
            is_paid = (
                tour.status in [Tour.Status.UNLOCKED, Tour.Status.COMPLETED] or
                tour.payments.filter(status=Payment.Statuses.SUCCESSFUL).exists()
            )

            decision_history.append({
                'id': log.id,
                'tour_id': tour.id,
                'tour_title': tour.title,
                'traveler_username': tour.traveler.username,
                'traveler_email': tour.traveler.email,
                'start_date': str(tour.start_date),
                'end_date': str(tour.end_date),
                'service_name': title,
                'service_details': desc,
                'decision': log.status,
                'estimated_income': price if log.status == ApprovalStatus.APPROVED else 0.00,
                'tour_status': tour.status,
                'is_paid': is_paid,
                'comments': log.comments or 'No remarks provided.',
                'actioned_at': log.actioned_at.strftime('%Y-%m-%d %H:%M') if log.actioned_at else '',
                'actioned_by': 'You' if log.manager == user else (log.manager.username if log.manager else 'System')
            })

        # Also capture any workflow with status in APPROVED/REJECTED not yet in logs
        for wf in workflows.filter(models.Q(**{status_field: ApprovalStatus.APPROVED}) | models.Q(**{status_field: ApprovalStatus.REJECTED})):
            if wf.tour_id not in actioned_tour_ids:
                tour = wf.tour
                status_val = getattr(wf, status_field)
                title, desc, price = get_tour_service_info(tour, user.role)
                is_paid = (
                    tour.status in [Tour.Status.UNLOCKED, Tour.Status.COMPLETED] or
                    tour.payments.filter(status=Payment.Statuses.SUCCESSFUL).exists()
                )
                decision_history.append({
                    'id': f"wf_{wf.id}",
                    'tour_id': tour.id,
                    'tour_title': tour.title,
                    'traveler_username': tour.traveler.username,
                    'traveler_email': tour.traveler.email,
                    'start_date': str(tour.start_date),
                    'end_date': str(tour.end_date),
                    'service_name': title,
                    'service_details': desc,
                    'decision': status_val,
                    'estimated_income': price if status_val == ApprovalStatus.APPROVED else 0.00,
                    'tour_status': tour.status,
                    'is_paid': is_paid,
                    'comments': wf.admin_remarks if user.role in [User.Roles.ADMIN, User.Roles.SUPER_ADMIN] else 'Direct checkpoint transition',
                    'actioned_at': wf.updated_at.strftime('%Y-%m-%d %H:%M') if wf.updated_at else '',
                    'actioned_by': 'System / Reviewer'
                })

        # Ensure LIFO order (latest decisions at the top)
        decision_history.sort(key=lambda x: x.get('actioned_at') or '', reverse=True)

        # Serialize inventory items managed by this user
        serialized_inventory = []
        for item in inventory_items[:20]:
            item_details = {
                'id': item.id,
                'name': getattr(item, 'name', getattr(item, 'vehicle_type', 'Service')),
                'is_available': item.is_available,
                'location': getattr(item, 'location', getattr(item, 'destination_city', 'All Service Areas')),
                'departure_city': getattr(item, 'departure_city', None),
                'destination_city': getattr(item, 'destination_city', None),
                'provider_name': getattr(item, 'provider_name', None),
                'room_type': getattr(item, 'room_type', None),
                'cuisine': getattr(item, 'cuisine', None),
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
                "total_approved_count": total_approved,
                "total_rejected_count": total_rejected,
                "total_decisions_count": total_decisions,
                "approval_rate": approval_rate,
                "estimated_income": round(estimated_income, 2),
                "total_income_alltime": round(total_income_alltime, 2),
                "total_pipeline_value": round(total_pipeline_value, 2),
                "average_revenue": avg_revenue,
                "total_managed_services": len(inventory_items) if isinstance(inventory_items, list) else inventory_items.count()
            },
            "recent_inventory": serialized_inventory,
            "decision_history": decision_history
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
        for log in ActivityLog.objects.all().order_by('-created_at')[:10]:
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
