from analytics.models import ActivityLog

def log_activity(user, action, details, request=None):
    """
    Utility helper to write audit entries to the ActivityLog database.
    Resolves client IP addresses from request headers if available.
    """
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    # Convert non-authenticated users to None (representing system or guest events)
    db_user = user if user and user.is_authenticated else None

    return ActivityLog.objects.create(
        user=db_user,
        action=action,
        details=details,
        ip_address=ip_address
    )
