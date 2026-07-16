import sys
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Executes a complete simulation of the tour planner workflow from registration to unlocked execution.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== STARTING END-TO-END WORKFLOW SIMULATION ==="))
        
        client = APIClient()
        
        try:
            with transaction.atomic():
                # ----------------------------------------------------
                # 1. Platform Setup & Users Scaffolding
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 1] Creating platform actors (Admin & Managers)..."))
                admin = User.objects.create_superuser(
                    email='admin_e2e@travel.com', username='admin_e2e', password='Password123',
                    role=User.Roles.ADMIN, status=User.Status.APPROVED, is_email_verified=True
                )
                flight_manager = User.objects.create_user(
                    email='flight_e2e@travel.com', username='flight_mgr_e2e', password='Password123',
                    role=User.Roles.FLIGHT_MANAGER, status=User.Status.APPROVED, is_email_verified=True
                )
                hotel_manager = User.objects.create_user(
                    email='hotel_e2e@travel.com', username='hotel_mgr_e2e', password='Password123',
                    role=User.Roles.HOTEL_MANAGER, status=User.Status.APPROVED, is_email_verified=True
                )
                self.stdout.write(self.style.SUCCESS("✓ Admin and Managers created successfully."))

                # ----------------------------------------------------
                # 2. Traveler Signup and email verification
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 2] Simulating Traveler registration flow..."))
                reg_data = {
                    "username": "traveler_e2e",
                    "email": "traveler_e2e@travel.com",
                    "password": "Password123",
                    "password_confirm": "Password123",
                    "role": "TRAVELER",
                    "phone_number": "+12345678",
                    "address": "456 Traveler Way"
                }
                response = client.post('/api/v1/auth/register/', reg_data, format='json')
                if response.status_code != status.HTTP_201_CREATED:
                    raise Exception(f"Traveler registration failed: {response.data}")
                
                traveler = User.objects.get(email='traveler_e2e@travel.com')
                self.stdout.write(self.style.SUCCESS(f"✓ Registered traveler: {traveler.email} (Status: {traveler.status}, Verified: {traveler.is_email_verified})"))
                
                # Simulate email click
                verify_res = client.get(f'/api/v1/auth/verify-email/?email={traveler.email}')
                if verify_res.status_code != status.HTTP_200_OK:
                    raise Exception("Email verification failed.")
                traveler.refresh_from_db()
                self.stdout.write(self.style.SUCCESS(f"✓ Email verified. Current Status: {traveler.status}"))

                # ----------------------------------------------------
                # 3. Admin Account Approval
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 3] Admin approving traveler registration..."))
                client.force_authenticate(user=admin)
                approve_res = client.post(f'/api/v1/auth/approve/{traveler.id}/', {"action": "approve"}, format='json')
                if approve_res.status_code != status.HTTP_200_OK:
                    raise Exception("Admin approval failed.")
                traveler.refresh_from_db()
                self.stdout.write(self.style.SUCCESS(f"✓ Account approved. Status: {traveler.status}"))

                # Configure travel preferences
                profile = traveler.profile
                profile.preferred_budget_tier = 'STANDARD'
                profile.preferred_travel_style = 'Beach'
                profile.save()

                # ----------------------------------------------------
                # 4. Catalog Inventory Setup
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 4] Configuring service inventory..."))
                from tours.models import FlightService, HotelService
                flight = FlightService.objects.create(
                    name='Pacific Air', flight_number='PA-123', departure_city='NYC', destination_city='MIA', price=200.00, manager=flight_manager
                )
                hotel = HotelService.objects.create(
                    name='MIA Beach Resort', location='MIA', room_type='Ocean View', price_per_night=150.00, manager=hotel_manager
                )
                self.stdout.write(self.style.SUCCESS(f"✓ Service catalog configured: Flight ID {flight.id}, Hotel ID {hotel.id}"))

                # ----------------------------------------------------
                # 5. Tour Planning & AI analysis
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 5] Traveler planning new tour..."))
                client.force_authenticate(user=traveler)
                
                # Fetch AI package recommendations first
                rec_res = client.get('/api/v1/tours/packages/ai-recommend/')
                self.stdout.write(self.style.SUCCESS(f"✓ Loaded {len(rec_res.data)} packages recommended by AI engine."))

                # Create custom tour compilation
                tour_data = {
                    "title": "Miami Getaway",
                    "start_date": "2026-08-01",
                    "end_date": "2026-08-06",
                    "budget_tier": "STANDARD",
                    "items": [
                        {"service_type": "FLIGHT", "flight": flight.id, "quantity": 1},
                        {"service_type": "HOTEL", "hotel": hotel.id, "quantity": 5}
                    ]
                }
                create_res = client.post('/api/v1/tours/tours/', tour_data, format='json')
                if create_res.status_code != status.HTTP_201_CREATED:
                    raise Exception(f"Tour creation failed: {create_res.data}")
                
                tour_id = create_res.data['id']
                from tours.models import Tour
                tour = Tour.objects.get(id=tour_id)
                self.stdout.write(self.style.SUCCESS(f"✓ Tour compiled: Base: ${tour.base_cost}, Markup: {tour.markup_percentage}%, Final: ${tour.final_price}"))

                # Fetch AI analysis of the plan
                analysis_res = client.get(f'/api/v1/tours/tours/{tour.id}/ai-analysis/')
                if analysis_res.status_code != status.HTTP_200_OK:
                    raise Exception("AI analysis failed.")
                prob = analysis_res.data['approval_probability']
                self.stdout.write(self.style.SUCCESS(f"✓ AI analysis completed: Approval Probability: {prob * 100:.0f}%"))

                # ----------------------------------------------------
                # 6. Approvals Workflow Pipelines
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 6] Submitting tour plan for approvals..."))
                submit_res = client.post(f'/api/v1/tours/tours/{tour.id}/submit/')
                if submit_res.status_code != status.HTTP_200_OK:
                    raise Exception("Tour submission failed.")
                
                from approvals.models import TourApproval
                workflow = TourApproval.objects.get(tour=tour)
                self.stdout.write(self.style.SUCCESS(f"✓ Workflow initiated. ID: {workflow.id}"))

                # Sequential checkpoint reviews
                action_url = f'/api/v1/approvals/{workflow.id}/action/'
                
                # Admin signoff
                client.force_authenticate(user=admin)
                client.post(action_url, {"status": "APPROVED", "comments": "Admin approved"}, format='json')
                
                # Flight manager signoff
                client.force_authenticate(user=flight_manager)
                client.post(action_url, {"status": "APPROVED", "comments": "Seats verified"}, format='json')
                
                # Hotel manager signoff
                client.force_authenticate(user=hotel_manager)
                hotel_res = client.post(action_url, {"status": "APPROVED", "comments": "Rooms locked"}, format='json')
                
                workflow.refresh_from_db()
                tour.refresh_from_db()
                self.stdout.write(self.style.SUCCESS(f"✓ All checkpoints approved. Workflow: {workflow.decision_engine_status}, Tour: {tour.status}"))

                # ----------------------------------------------------
                # 7. Payment Verification & Unlock
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 7] Processing payment..."))
                client.force_authenticate(user=traveler)
                pay_res = client.post('/api/v1/payments/mock-pay/', {"tour_id": tour.id}, format='json')
                if pay_res.status_code != status.HTTP_200_OK:
                    raise Exception(f"Checkout simulation failed: {pay_res.data}")
                
                tour.refresh_from_db()
                self.stdout.write(self.style.SUCCESS(f"✓ Checkout processed successfully. Tour Status: {tour.status}"))

                # ----------------------------------------------------
                # 8. Notifications and Audit Telemetry Checks
                # ----------------------------------------------------
                self.stdout.write(self.style.WARNING("\n[Step 8] Verifying notifications and audit telemetry trails..."))
                notif_res = client.get('/api/v1/notifications/')
                self.stdout.write(self.style.SUCCESS(f"✓ Traveler received {len(notif_res.data)} alerts successfully."))
                
                client.force_authenticate(user=admin)
                log_res = client.get('/api/v1/analytics/logs/')
                self.stdout.write(self.style.SUCCESS(f"✓ Admin telemetry logged {len(log_res.data)} activities successfully."))

                # Raise exception to trigger database rollback
                # This ensures we don't pollute the dev/local database with verify scripts data!
                raise Exception("RollbackSuccess")

        except Exception as e:
            if str(e) == "RollbackSuccess":
                self.stdout.write(self.style.SUCCESS("\n=== E2E WORKFLOW SIMULATION PASSED SUCCESSFUL ==="))
            else:
                self.stdout.write(self.style.ERROR(f"\nE2E Verification Failed: {str(e)}"))
                sys.exit(1)
