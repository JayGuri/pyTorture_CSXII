#!/usr/bin/env python3
"""
MongoDB seed script: Clean old test data and populate with realistic call records.
Usage: python scripts/seed_mongo.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load env vars
root = Path(__file__).parent.parent.parent
load_dotenv(root / ".env")
load_dotenv(root / "backend" / ".env", override=True)

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "")


def _resolve_database_name(uri: str) -> str:
    """Extract database name from MongoDB URI."""
    from urllib.parse import urlparse

    path = urlparse(uri).path.strip("/")
    return path or "fateh"


async def seed_mongo():
    """Clean and seed MongoDB with realistic caller data."""
    if not MONGODB_URI:
        print("❌ MONGODB_URI not set in environment")
        sys.exit(1)

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[_resolve_database_name(MONGODB_URI)]

    print(f"🔌 Connected to MongoDB: {db.name}")

    # Get callers collection
    callers = db.callers

    # Step 1: Drop old collection
    print("\n📋 Step 1: Dropping old callers collection...")
    try:
        await callers.drop()
        print("✅ Old collection dropped")
    except Exception as e:
        print(f"⚠️  Could not drop collection: {e}")

    # Step 2: Create realistic test data
    print("\n📝 Step 2: Creating realistic caller data...")

    now = datetime.now(timezone.utc)
    caller_data = [
        {
            "_id": "+919876543210",  # Hot lead - very engaged
            "phone": "+919876543210",
            "name": "Priya Sharma",
            "email": "priya.sharma@gmail.com",
            "location": "Mumbai, Maharashtra",
            "education_level": "Bachelor's",
            "field": "Computer Science",
            "institution": "IIT Bombay",
            "gpa": 8.5,
            "target_countries": ["USA", "Canada", "UK"],
            "course_interest": "Master's in CS",
            "intake_timing": "Fall 2025",
            "test_type": "IELTS",
            "test_score": 7.5,
            "test_stage": "completed",
            "budget_range": "$30,000-$40,000",
            "budget_status": "disclosed",
            "scholarship_interest": True,
            "lead_score": 85,
            "classification": "Hot",
            "callback_requested": True,
            "competitor_mentioned": False,
            "ielts_upsell_flag": False,
            "next_con_session": "050426/14:30",
            "con_session_req": "approved",
            "memory": {
                "messages": [
                    {
                        "role": "user",
                        "content": "I'm interested in MS CS programs in USA",
                        "timestamp": (now - timedelta(days=7)).isoformat(),
                    },
                    {
                        "role": "assistant",
                        "content": "Great! Let me help you find universities matching your profile.",
                        "timestamp": (now - timedelta(days=7)).isoformat(),
                    },
                    {
                        "role": "user",
                        "content": "My IELTS score is 7.5. What are my chances?",
                        "timestamp": (now - timedelta(days=5)).isoformat(),
                    },
                    {
                        "role": "assistant",
                        "content": "Excellent score! You're eligible for many top universities.",
                        "timestamp": (now - timedelta(days=5)).isoformat(),
                    },
                ],
                "summary": "High-intent student with strong academic background and IELTS score. Interested in MS CS in USA/Canada/UK. Has budget disclosed ($30-40K). Requested callback.",
                "last_summary_at": (now - timedelta(days=5)).isoformat(),
                "total_turns": 4,
                "topics_discussed": [
                    "Program selection",
                    "IELTS requirements",
                    "Scholarship opportunities",
                    "Budget planning",
                ],
            },
            "calls": [
                {
                    "call_sid": "CA_priya_001",
                    "started_at": (now - timedelta(days=7)).isoformat(),
                    "ended_at": (now - timedelta(days=7, minutes=-15)).isoformat(),
                    "duration_seconds": 900,
                    "language": "en-IN",
                    "turns": 8,
                    "status": "completed",
                },
                {
                    "call_sid": "CA_priya_002",
                    "started_at": (now - timedelta(days=5)).isoformat(),
                    "ended_at": (now - timedelta(days=5, minutes=-20)).isoformat(),
                    "duration_seconds": 1200,
                    "language": "en-IN",
                    "turns": 8,
                    "status": "completed",
                },
                {
                    "call_sid": "CA_priya_003",
                    "started_at": (now - timedelta(days=2)).isoformat(),
                    "ended_at": (now - timedelta(days=2, minutes=-12)).isoformat(),
                    "duration_seconds": 720,
                    "language": "en-IN",
                    "turns": 6,
                    "status": "completed",
                },
            ],
            "first_contact": (now - timedelta(days=7)).isoformat(),
            "last_contact": (now - timedelta(days=2)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "_id": "+919876543211",  # Warm lead - interested but needs more info
            "phone": "+919876543211",
            "name": "Rajesh Patel",
            "email": "rajesh.patel95@outlook.com",
            "location": "Bangalore, Karnataka",
            "education_level": "Bachelor's",
            "field": "Electronics",
            "institution": "PESIT Bangalore",
            "gpa": 7.2,
            "target_countries": ["UK", "Australia"],
            "course_interest": "Master's in Electronics",
            "intake_timing": "Spring 2026",
            "test_type": "IELTS",
            "test_score": 6.5,
            "test_stage": "preparing",
            "budget_range": "$20,000-$30,000",
            "budget_status": "deferred",
            "scholarship_interest": True,
            "lead_score": 65,
            "classification": "Warm",
            "callback_requested": False,
            "competitor_mentioned": False,
            "ielts_upsell_flag": True,
            "next_con_session": None,
            "con_session_req": "none",
            "memory": {
                "messages": [
                    {
                        "role": "user",
                        "content": "I want to study in UK. What options do I have?",
                        "timestamp": (now - timedelta(days=14)).isoformat(),
                    },
                    {
                        "role": "assistant",
                        "content": "UK has excellent universities. What's your field of interest?",
                        "timestamp": (now - timedelta(days=14)).isoformat(),
                    },
                ],
                "summary": "Student exploring UK universities for Electronics Masters. IELTS score 6.5 (still preparing). Interested in scholarships. Budget flexible.",
                "last_summary_at": (now - timedelta(days=14)).isoformat(),
                "total_turns": 2,
                "topics_discussed": ["University selection", "IELTS preparation"],
            },
            "calls": [
                {
                    "call_sid": "CA_rajesh_001",
                    "started_at": (now - timedelta(days=14)).isoformat(),
                    "ended_at": (now - timedelta(days=14, minutes=-10)).isoformat(),
                    "duration_seconds": 600,
                    "language": "en-IN",
                    "turns": 2,
                    "status": "completed",
                },
            ],
            "first_contact": (now - timedelta(days=14)).isoformat(),
            "last_contact": (now - timedelta(days=14)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "_id": "+919876543212",  # Cold lead - minimal engagement
            "phone": "+919876543212",
            "name": "Ananya Gupta",
            "email": None,
            "location": "Delhi, NCR",
            "education_level": "Bachelor's",
            "field": "Business",
            "institution": "Delhi University",
            "gpa": 6.8,
            "target_countries": None,
            "course_interest": None,
            "intake_timing": None,
            "test_type": None,
            "test_score": None,
            "test_stage": "not_started",
            "budget_range": None,
            "budget_status": "not_asked",
            "scholarship_interest": False,
            "lead_score": 30,
            "classification": "Cold",
            "callback_requested": False,
            "competitor_mentioned": False,
            "ielts_upsell_flag": False,
            "next_con_session": None,
            "con_session_req": "none",
            "memory": {
                "messages": [
                    {
                        "role": "user",
                        "content": "I'm just exploring options",
                        "timestamp": (now - timedelta(days=30)).isoformat(),
                    },
                ],
                "summary": "Just exploring. Minimal engagement. No clear goals or timeline.",
                "last_summary_at": (now - timedelta(days=30)).isoformat(),
                "total_turns": 1,
                "topics_discussed": [],
            },
            "calls": [
                {
                    "call_sid": "CA_ananya_001",
                    "started_at": (now - timedelta(days=30)).isoformat(),
                    "ended_at": (now - timedelta(days=30, minutes=-5)).isoformat(),
                    "duration_seconds": 300,
                    "language": "en-IN",
                    "turns": 1,
                    "status": "completed",
                },
            ],
            "first_contact": (now - timedelta(days=30)).isoformat(),
            "last_contact": (now - timedelta(days=30)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "_id": "+919876543213",  # Hot lead - MBA focused
            "phone": "+919876543213",
            "name": "Vikram Singh",
            "email": "vikram.singh@gmail.com",
            "location": "Pune, Maharashtra",
            "education_level": "Bachelor's",
            "field": "Engineering",
            "institution": "COEP Pune",
            "gpa": 8.1,
            "target_countries": ["USA", "Canada"],
            "course_interest": "MBA",
            "intake_timing": "Fall 2025",
            "test_type": "GMAT",
            "test_score": 710,
            "test_stage": "completed",
            "budget_range": "$40,000-$60,000",
            "budget_status": "disclosed",
            "scholarship_interest": True,
            "lead_score": 90,
            "classification": "Hot",
            "callback_requested": True,
            "competitor_mentioned": True,
            "ielts_upsell_flag": False,
            "next_con_session": "060426/10:00",
            "con_session_req": "approved",
            "memory": {
                "messages": [
                    {
                        "role": "user",
                        "content": "I'm a working professional. Want MBA from top B-schools.",
                        "timestamp": (now - timedelta(days=3)).isoformat(),
                    },
                    {
                        "role": "assistant",
                        "content": "Your GMAT score is excellent! Let me show you best MBA programs.",
                        "timestamp": (now - timedelta(days=3)).isoformat(),
                    },
                    {
                        "role": "user",
                        "content": "How is your service different from XYZ consultancy?",
                        "timestamp": (now - timedelta(days=2)).isoformat(),
                    },
                    {
                        "role": "assistant",
                        "content": "We offer personalized AI-driven guidance with holistic support.",
                        "timestamp": (now - timedelta(days=2)).isoformat(),
                    },
                ],
                "summary": "Working professional, GMAT 710, wants MBA from USA/Canada. Very high intent. Already comparing with competitors. Good budget.",
                "last_summary_at": (now - timedelta(days=2)).isoformat(),
                "total_turns": 4,
                "topics_discussed": [
                    "MBA selection",
                    "GMAT score evaluation",
                    "Competitor comparison",
                    "Application timeline",
                ],
            },
            "calls": [
                {
                    "call_sid": "CA_vikram_001",
                    "started_at": (now - timedelta(days=3)).isoformat(),
                    "ended_at": (now - timedelta(days=3, minutes=-18)).isoformat(),
                    "duration_seconds": 1080,
                    "language": "en-IN",
                    "turns": 8,
                    "status": "completed",
                },
                {
                    "call_sid": "CA_vikram_002",
                    "started_at": (now - timedelta(days=2)).isoformat(),
                    "ended_at": (now - timedelta(days=2, minutes=-14)).isoformat(),
                    "duration_seconds": 840,
                    "language": "en-IN",
                    "turns": 8,
                    "status": "completed",
                },
            ],
            "first_contact": (now - timedelta(days=3)).isoformat(),
            "last_contact": (now - timedelta(days=2)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "_id": "+919876543214",  # Warm lead - PhD interested
            "phone": "+919876543214",
            "name": "Neha Desai",
            "email": "neha.desai@gmail.com",
            "location": "Ahmedabad, Gujarat",
            "education_level": "Master's",
            "field": "Physics",
            "institution": "IIT Gandhinagar",
            "gpa": 8.7,
            "target_countries": ["USA", "Germany"],
            "course_interest": "PhD Physics",
            "intake_timing": "Fall 2025",
            "test_type": "IELTS",
            "test_score": 7.8,
            "test_stage": "completed",
            "budget_range": "Fully Funded",
            "budget_status": "disclosed",
            "scholarship_interest": True,
            "lead_score": 78,
            "classification": "Warm",
            "callback_requested": True,
            "competitor_mentioned": False,
            "ielts_upsell_flag": False,
            "next_con_session": "070426/16:00",
            "con_session_req": "in_process",
            "memory": {
                "messages": [
                    {
                        "role": "user",
                        "content": "I want to pursue PhD in Physics abroad",
                        "timestamp": (now - timedelta(days=5)).isoformat(),
                    },
                    {
                        "role": "assistant",
                        "content": "Excellent academic background! PhD positions are highly funded.",
                        "timestamp": (now - timedelta(days=5)).isoformat(),
                    },
                ],
                "summary": "Master's graduate from IIT with strong IELTS. Seeking PhD in Physics. Fully funded preference. Strong research interest.",
                "last_summary_at": (now - timedelta(days=5)).isoformat(),
                "total_turns": 2,
                "topics_discussed": ["PhD programs", "Fully funded opportunities"],
            },
            "calls": [
                {
                    "call_sid": "CA_neha_001",
                    "started_at": (now - timedelta(days=5)).isoformat(),
                    "ended_at": (now - timedelta(days=5, minutes=-16)).isoformat(),
                    "duration_seconds": 960,
                    "language": "en-IN",
                    "turns": 2,
                    "status": "completed",
                },
            ],
            "first_contact": (now - timedelta(days=5)).isoformat(),
            "last_contact": (now - timedelta(days=5)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "_id": "+919876543215",  # New caller - single interaction
            "phone": "+919876543215",
            "name": "Aditya Kumar",
            "email": "aditya.kumar2005@gmail.com",
            "location": "Chandigarh, Punjab",
            "education_level": "Bachelor's",
            "field": "Information Technology",
            "institution": "Chandigarh University",
            "gpa": 7.5,
            "target_countries": ["Canada"],
            "course_interest": "Master's in Data Science",
            "intake_timing": "Winter 2025",
            "test_type": None,
            "test_score": None,
            "test_stage": "not_started",
            "budget_range": "$15,000-$25,000",
            "budget_status": "not_asked",
            "scholarship_interest": True,
            "lead_score": 45,
            "classification": "Cold",
            "callback_requested": False,
            "competitor_mentioned": False,
            "ielts_upsell_flag": True,
            "next_con_session": None,
            "con_session_req": "none",
            "memory": {
                "messages": [
                    {
                        "role": "user",
                        "content": "I want to go to Canada for Data Science",
                        "timestamp": now.isoformat(),
                    },
                    {
                        "role": "assistant",
                        "content": "Canada has excellent Data Science programs. Let me help you explore.",
                        "timestamp": now.isoformat(),
                    },
                ],
                "summary": "New lead from today. Interested in Canada for Data Science. No test scores yet. Needs IELTS guidance.",
                "last_summary_at": now.isoformat(),
                "total_turns": 2,
                "topics_discussed": ["Canada study options"],
            },
            "calls": [
                {
                    "call_sid": "CA_aditya_001",
                    "started_at": now.isoformat(),
                    "ended_at": None,
                    "duration_seconds": None,
                    "language": "en-IN",
                    "turns": 2,
                    "status": "active",
                },
            ],
            "first_contact": now.isoformat(),
            "last_contact": now.isoformat(),
            "updated_at": now.isoformat(),
        },
    ]

    # Step 3: Insert realistic data
    print("\n📥 Step 3: Inserting realistic caller data...")
    try:
        result = await callers.insert_many(caller_data)
        print(f"✅ Inserted {len(result.inserted_ids)} caller documents")
    except Exception as e:
        print(f"❌ Error inserting data: {e}")
        sys.exit(1)

    # Step 4: Create indexes
    print("\n🔍 Step 4: Creating indexes...")
    try:
        await callers.create_index("classification")
        await callers.create_index("lead_score")
        await callers.create_index("last_contact")
        print("✅ Indexes created")
    except Exception as e:
        print(f"⚠️  Error creating indexes: {e}")

    # Step 5: Verify data
    print("\n📊 Step 5: Verifying data...")
    total_count = await callers.count_documents({})
    hot_count = await callers.count_documents({"classification": "Hot"})
    warm_count = await callers.count_documents({"classification": "Warm"})
    cold_count = await callers.count_documents({"classification": "Cold"})

    print(f"✅ Total callers: {total_count}")
    print(f"   🔴 Hot leads: {hot_count}")
    print(f"   🟡 Warm leads: {warm_count}")
    print(f"   🔵 Cold leads: {cold_count}")

    # Close connection
    client.close()
    print("\n✅ Done! MongoDB seeded with realistic call data.\n")


if __name__ == "__main__":
    asyncio.run(seed_mongo())
