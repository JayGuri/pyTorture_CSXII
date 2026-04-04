# Mock Data Setup & Testing Guide

## ✅ Status: Complete

Mock data seeding is fully functional and integrated with the backend.

---

## Quick Start

### 1. Populate Database with Test Data

```bash
cd backend
python -m src.db.seed_mock_leads
```

**Output:**
- 8 realistic test leads (3 HOT, 3 WARM, 2 COLD)
- All profiles fully populated (GPA, IELTS scores, target countries, budgets, etc.)
- Ready for API testing

### 2. Test the For You API

Once data is seeded, test the API endpoints:

#### Get Lead Profile by Email
```bash
curl -X POST 'http://localhost:8000/api/v1/for-you/profile' \
  -H 'Content-Type: application/json' \
  -d '{"email": "aanya.sharma.1775307603@example.com"}'
```

#### Get Personalized Dashboard
```bash
curl 'http://localhost:8000/api/v1/for-you/dashboard?email=aanya.sharma.1775307603@example.com'
```

#### Get Personalized Insights
Requires a lead to exist in database first.

---

## Test Data Available

| Name | Classification | GPA | IELTS | Budget | Target Countries |
|------|---|---|---|---|---|
| Aanya Sharma | Hot | 7.8 | 7.5 | Medium | UK, Ireland |
| Vikram Singh | Hot | 6.8 | 7.0 | Low | UK |
| Rohan Desai | Hot | 8.1 | 8.0 | Medium | UK |
| Priya Patel | Warm | 7.2 | - | High | UK, Ireland, USA |
| Rahul Kumar | Warm | 6.5 | 6.5 | Medium | UK |
| Divya Nair | Warm | 7.4 | - | Medium | UK |
| Neha Gupta | Cold | 6.0 | - | - | UK, Ireland |
| Arjun Verma | Cold | 5.8 | - | - | Ireland |

---

## Database Details

- **Table:** `leads`
- **Records:** 8 test leads
- **Fields:** name, email, GPA, IELTS/PTE, target_countries, budget_range, classification, and more

### Notes on `session_id`

The `session_id` field is not populated during seeding because:
- It's meant to be populated by Twilio call integration
- Use **email** parameter for API queries instead
- In production, Twilio calls will populate `session_id` automatically

---

## Seeding with Different Data

To modify test data, edit the `create_mock_leads()` function in:
```
backend/src/db/seed_mock_leads.py
```

### Run Seeder Multiple Times

Each run generates unique emails (with timestamps) to avoid conflicts:
```
aanya.sharma.1775307603@example.com
aanya.sharma.1775307607@example.com  (next run)
```

### Clear Database

```bash
cd backend
python -c "from src.db.seed_mock_leads import clear_mock_leads; clear_mock_leads()"
```

---

## Architecture

```
Backend Flow:
┌─────────────────────────────────────┐
│  seed_mock_leads.py                │
│  - create_mock_leads()              │
│  - seed_mock_leads()                │
│  - clear_mock_leads()               │
└──────────────┬──────────────────────┘
               │ (inserts via PostgREST)
               ▼
┌─────────────────────────────────────┐
│  Supabase PostgreSQL                │
│  Table: leads                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  API Routes (for_you.py)            │
│  - /api/v1/for-you/dashboard        │
│  - /api/v1/for-you/profile          │
│  - /api/v1/for-you/insights/{id}    │
└─────────────────────────────────────┘
```

---

## Known Issues & Solutions

### Issue: "409 Conflict" Error
**Solution:** The `session_id` field cannot be provided during insert. Use `email` parameter for API queries.

### Issue: Duplicate Leads
**Solution:** Each seeder run creates unique emails. Clear the database between runs if needed.

### Issue: "Lead not found"
**Solution:** Verify email exists in database and use exact email string from seeder output.

---

## Next Steps

1. ✅ Mock data seeding works
2. ✅ Backend service layer complete
3. ⏭️  **Frontend Integration** (in progress)
   - Connect frontend `/for-you` page to backend API
   - Use email-based queries instead of session_id
   - Display real personalized recommendations

---

## Files Modified

- `backend/src/db/seed_mock_leads.py` — Mock data seeder (fixed session_id issue)
- `backend/src/services/for_you_service.py` — Service layer (unchanged)
- `backend/src/routes/for_you.py` — API routes (unchanged)
- `backend/src/main.py` — Router registration (unchanged)

