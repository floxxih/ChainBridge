"""Email notification service using SendGrid."""

import logging
from typing import Dict, Any, Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.enabled = settings.email_enabled
        self.client = None
        if self.enabled and settings.email_provider == "sendgrid":
            self.client = SendGridAPIClient(settings.sendgrid_api_key)
        # TODO: Add SES support

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> bool:
        """Send an email using the configured provider."""
        if not self.enabled or not self.client:
            logger.warning("Email service not enabled or configured")
            return False

        from_email = from_email or settings.email_from
        from_name = from_name or settings.email_from_name

        message = Mail(
            from_email=Email(from_email, from_name),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content),
        )
        if text_content:
            message.add_content(Content("text/plain", text_content))

        try:
            response = self.client.send(message)
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code} {response.body}")
                return False
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

    async def send_template_email(
        self,
        to_email: str,
        template_id: str,
        template_data: Dict[str, Any],
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> bool:
        """Send a templated email."""
        # TODO: Implement template sending
        logger.info(f"Template email to {to_email} with template {template_id}")
        return True


# Global email service instance
email_service = EmailService()