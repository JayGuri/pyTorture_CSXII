"""
Demo Users Seeder for Supabase

Seeds demo user accounts into leads table matching frontend mock auth credentials.
These are for development and testing only.

Demo Accounts:
- demo@fateh.education / demo12345
- new@fateh.education / newuser123

Usage:
    python -m src.db.seed_demo_users

Or from Python:
    from src.db.seed_demo_users import seed_demo_users
    seed_demo_users()
"""

import uuid
from typing import List, Dict, Any
from src.db.supabase_client import supabase
import logging

logger = logging.getLogger(__name__)


def generate_session_id() -> str:
    """Generate a unique session ID."""
    return str(uuid.uuid4())


def create_demo_users() -> List[Dict[str, Any]]:
    """Create demo user accounts as leads in database."""

    return [
        {
            "name": "Demo User",
            "email": "demo@fateh.education",
            "phone": "+91-9999999999",
            "location": "Demo Location",
            "classification": "Cold",
            "target_countries": ["UK", "Ireland"],
            "education_level": "Bachelors",
        },
        {
            "name": "New User",
            "email": "new@fateh.education",
            "phone": "+91-8888888888",
            "location": "Demo Location",
            "classification": "Cold",
            "target_countries": ["UK", "Ireland"],
            "education_level": "Bachelors",
        },
    ]


def seed_demo_users():
    """Seed demo users to the database."""
    try:
        logger.info("Starting demo users seeding...")

        demo_users = create_demo_users()

        # Insert demo users
        for user in demo_users:
            try:
                result = supabase.table("leads").insert(user).execute()
                logger.info(f"✅ Created demo user: {user['email']}")
            except Exception as e:
                if "409" in str(e) or "duplicate" in str(e).lower() or "unique" in str(e).lower():
                    logger.info(f"⚠️  Demo user already exists: {user['email']}")
                else:
                    raise

        logger.info(f"✅ Successfully seeded demo users")

        # Verify seeding
        result = supabase.table("leads").select("email, name").ilike("email", "%fateh.education").execute()
        logger.info(f"Demo users in database: {[u['email'] for u in result.data]}")

    except Exception as e:
        logger.error(f"❌ Failed to seed demo users: {e}")
        raise


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    seed_demo_users()
