from django.contrib.auth import get_user_model
from notifications.models import InAppNotification
from notifications.tasks import send_email_task

User = get_user_model()

def notify_user(user, title, subject, message):
    """
    Unified utility to send both In-App alert and async Celery Email notification.
    """
    # 1. Create In-App Notification record
    InAppNotification.objects.create(
        user=user,
        title=title,
        message=message
    )
    
    try:
        # 2. Trigger asynchronous email task in Celery
        send_email_task.delay(user.id, subject, message)
    except Exception:
        # If Celery/Redis is down, fallback to synchronous execution to prevent crash
        try:
            send_email_task(user.id, subject, message)
        except Exception as e:
            import logging
            logging.error(f"Failed to send email notification: {e}")
