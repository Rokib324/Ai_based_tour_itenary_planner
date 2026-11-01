import logging
from celery import shared_task
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()
logger = logging.getLogger(__name__)

@shared_task(name='notifications.tasks.send_email_task')
def send_email_task(user_id, subject, message_content):
    """
    Asynchronous Celery task to send email using Django's core mail dispatcher.
    """
    try:
        user = User.objects.get(id=user_id)
        recipient = user.email
        
        logger.info(f"Dispatching email to {recipient} with subject: {subject}")
        
        # If no SMTP credentials configured, skip attempting remote socket connection
        if not getattr(settings, 'EMAIL_HOST_USER', None) and 'smtp' in getattr(settings, 'EMAIL_BACKEND', '').lower():
            logger.info(f"Skipping remote SMTP dispatcher for {recipient} - EMAIL_HOST_USER not configured.")
            return f"Email simulated (no credentials): {recipient}"

        send_mail(
            subject=subject,
            message=message_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return f"Email sent successfully to {recipient}"
    except User.DoesNotExist:
        logger.error(f"Cannot send email. User with ID {user_id} not found.")
        return "User not found"
    except Exception as e:
        logger.error(f"Failed to send email to user ID {user_id}: {str(e)}")
        # In development/test, we don't crash task due to local SMTP absence
        return f"Email sending bypassed/failed: {str(e)}"
