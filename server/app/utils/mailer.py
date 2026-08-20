import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
from app.utils.logger import logger

async def send_password_reset_email(to_email: str, token: str):
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(f"SMTP not configured. Reset token for {to_email}: {token}")
        return

    # The client's reset form lives under /auth — a bare /reset-password
    # route does not exist and the emailed link would 404.
    reset_url = f"{settings.CLIENT_URL}/auth/reset-password?token={token}"
    
    msg = MIMEMultipart()
    msg['From'] = f"RIJITA by Arya Foods <{settings.ADMIN_EMAIL}>"
    msg['To'] = to_email
    msg['Subject'] = "Password Reset Request - RIJITA by Arya Foods"

    body = f"""
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your RIJITA account.</p>
    <p>Please click the link below to reset your password (valid for 1 hour):</p>
    <p><a href="{reset_url}">{reset_url}</a></p>
    <p>If you did not request this, please ignore this email.</p>
    """
    msg.attach(MIMEText(body, 'html'))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)
        logger.info(f"Password reset email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
