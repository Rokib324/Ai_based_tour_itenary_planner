from django.urls import path
from django.views.generic import TemplateView
from payments.views import (
    CreateCheckoutSessionView,
    StripeWebhookView,
    MockPaymentView,
    PaymentHistoryListView
)

urlpatterns = [
    path('checkout-session/', CreateCheckoutSessionView.as_view(), name='payment_checkout_session'),
    path('stripe-webhook/', StripeWebhookView.as_view(), name='payment_stripe_webhook'),
    path('mock-pay/', MockPaymentView.as_view(), name='payment_mock_pay'),
    path('history/', PaymentHistoryListView.as_view(), name='payment_history'),
    
    # Success/Cancel templates placeholders
    path('success/', TemplateView.as_view(template_name='payments/success.html'), name='payment_success'),
    path('cancel/', TemplateView.as_view(template_name='payments/cancel.html'), name='payment_cancel'),
]
