# MongoDB Seed Scripts

## seed_mongo.py

Cleans the old MongoDB `callers` collection and populates it with realistic, Indian student-focused call data.

### What It Does

1. **Drops** the existing `callers` collection
2. **Creates** 6 realistic caller documents with:
   - Indian student profiles (names, locations, institutions)
   - Different lead classifications (Hot, Warm, Cold)
   - Realistic call history with multiple interactions
   - Conversation memory with previous dialogue
   - Test scores (IELTS, GMAT, GRE)
   - Budget information
   - Education details
3. **Creates** MongoDB indexes for efficient querying
4. **Verifies** the data with counts by classification

### Data Profiles Created

| Name | Phone | Classification | Status | Call Count |
|------|-------|-----------------|--------|-----------|
| Priya Sharma | +919876543210 | Hot | MS CS, Fall 2025 | 3 calls |
| Rajesh Patel | +919876543211 | Warm | Electronics, Spring 2026 | 1 call |
| Ananya Gupta | +919876543212 | Cold | Just exploring | 1 call |
| Vikram Singh | +919876543213 | Hot | MBA, Fall 2025 | 2 calls |
| Neha Desai | +919876543214 | Warm | PhD Physics, Fall 2025 | 1 call |
| Aditya Kumar | +919876543215 | Cold | Data Science, Winter 2025 | 1 call (active) |

### Running the Script

**Prerequisites:**
- Backend environment configured (`.env` file with `MONGODB_URI`)
- Python virtual environment activated
- Motor library installed (already in requirements)

**Steps:**

```bash
cd backend
source venv/bin/activate

# Run the seed script
python scripts/seed_mongo.py
```

### Expected Output

```
🔌 Connected to MongoDB: fateh

📋 Step 1: Dropping old callers collection...
✅ Old collection dropped

📝 Step 2: Creating realistic caller data...

📥 Step 3: Inserting realistic caller data...
✅ Inserted 6 caller documents

🔍 Step 4: Creating indexes...
✅ Indexes created

📊 Step 5: Verifying data...
✅ Total callers: 6
   🔴 Hot leads: 2
   🟡 Warm leads: 2
   🔵 Cold leads: 2

✅ Done! MongoDB seeded with realistic call data.
```

### Data Features

#### Each Caller Document Contains:

- **Basic Info:** phone (used as `_id`), name, email, location
- **Education:** level, field, institution, GPA
- **Interest:** target countries, course type, intake timing
- **Test Scores:** type (IELTS/GMAT/GRE), score, stage
- **Budget:** range and status (disclosed/deferred/not_asked)
- **Lead Scoring:** lead_score (0-100), classification (Hot/Warm/Cold)
- **Call Flags:** callback_requested, competitor_mentioned, ielts_upsell_flag
- **Callback Session:** next scheduled session, request status
- **Conversation Memory:**
  - Previous messages with timestamps
  - Auto-generated summary
  - Topics discussed
  - Total conversation turns
- **Call History:** Multiple call records with:
  - Twilio call_sid
  - Start/end times with durations
  - Language and conversation turns
  - Status (active/completed/dropped/no-answer)

### Customization

To modify the seed data, edit the `caller_data` list in `seed_mongo.py`:

```python
caller_data = [
    {
        "_id": "+919876543210",
        "phone": "+919876543210",
        "name": "Your Name",
        # ... other fields
    },
]
```

### Safety

This script **DROPS the entire callers collection** before seeding. Do not run on production without backing up first!

```bash
# Backup your data first (if needed)
mongodump --uri "your-mongodb-uri" --out ./backup/
```

### Debugging

If the script fails:

1. Verify `MONGODB_URI` is set:
   ```bash
   echo $MONGODB_URI
   ```

2. Test MongoDB connection:
   ```bash
   python -c "from motor.motor_asyncio import AsyncIOMotorClient; print('OK')"
   ```

3. Check that you're in the right directory:
   ```bash
   pwd  # should be backend directory
   ```
