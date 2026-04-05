import uuid
import random
import string
import logging

logger = logging.getLogger(__name__)

class CalendarService:
    @staticmethod
    def generate_meet_code():
        """Generates a standard 3-4-3 Google Meet code format."""
        part1 = "".join(random.choices(string.ascii_lowercase, k=3))
        part2 = "".join(random.choices(string.ascii_lowercase, k=4))
        part3 = "".join(random.choices(string.ascii_lowercase, k=3))
        return f"{part1}-{part2}-{part3}"

    @staticmethod
    async def schedule_meeting(email: str, date: str, time: str, consultant: str, university: str):
        """
        Simulates scheduling a Google Calendar meeting with GMeet link generation.
        """
        meet_code = CalendarService.generate_meet_code()
        gmeet_link = f"https://meet.google.com/{meet_code}"
        
        # Simulate Google Calendar Sync
        logger.info(f"CALENDAR_SYNC: Event created for {email} on {date} at {time} with {consultant}")
        
        # Simulate Email Delivery
        logger.info(f"EMAIL_SENT: Confirmation sent to {email} for meeting with {consultant}")
        
        return {
            "id": str(uuid.uuid4())[:8],
            "status": "CONFIRMED",
            "consultant": consultant,
            "university": university,
            "date": date,
            "time": time,
            "meetLink": gmeet_link,
            "type": "Bespoke Consultation",
            "syncStatus": "Calendar Synced",
            "email_dispatched": True,
            "calendar_mirrored": True
        }
