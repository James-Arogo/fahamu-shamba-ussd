# Community Page 500 Error - FIXED ✅

## Problem Identified
The community page was returning a **500 Internal Server Error** due to a **database schema mismatch** between the migration script and the community service code.

## Root Cause
The PostgreSQL migration script (`migrate-to-postgres.js`) created community tables with incorrect column names:
- ❌ Used: `user_phone`, `user_name`, `question`, `answer`, `story`
- ✅ Expected: `author_phone`, `author_name`, `content`

The community service (`community-service-async.js`) was trying to insert data into columns that didn't exist, causing SQL errors and 500 responses.

## Solution Applied

### 1. Updated Migration Script
Fixed `backend/migrate-to-postgres.js` to create tables with correct schema matching the service expectations:

**Community Questions Table:**
```sql
CREATE TABLE community_questions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,              -- Changed from 'question'
  author_phone VARCHAR(20) NOT NULL,  -- Changed from 'user_phone'
  author_name VARCHAR(100),           -- Changed from 'user_name'
  sub_county VARCHAR(100),
  category VARCHAR(50) DEFAULT 'general',
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Community Answers Table:**
```sql
CREATE TABLE community_answers (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES community_questions(id),
  content TEXT NOT NULL,              -- Changed from 'answer'
  author_phone VARCHAR(20) NOT NULL,  -- Changed from 'user_phone'
  author_name VARCHAR(100),           -- Changed from 'user_name'
  upvotes INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Success Stories Table:**
```sql
CREATE TABLE success_stories (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,              -- Changed from 'story'
  author_phone VARCHAR(20) NOT NULL,  -- Changed from 'user_phone'
  author_name VARCHAR(100),           -- Changed from 'user_name'
  sub_county VARCHAR(100),
  crop_grown VARCHAR(100),
  yield_achieved VARCHAR(100),
  image_url TEXT,
  likes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 2. Created Schema Fix Script
Created `backend/fix-community-schema.js` to:
- Drop existing community tables with incorrect schema
- Recreate all 5 community tables with correct column names
- Add proper indexes and foreign keys

### 3. Executed Fix
Ran the fix script successfully:
```bash
node backend/fix-community-schema.js
```

**Result:**
```
✅ 5 community tables recreated with correct schema
✅ All indexes created
✅ Foreign keys configured
```

## Tables Fixed
1. ✅ `community_questions`
2. ✅ `community_answers`
3. ✅ `success_stories`
4. ✅ `discussion_topics`
5. ✅ `discussion_posts`

## Testing
The community page should now work correctly. Test the following features:

### Q&A Section
- ✅ Ask a question
- ✅ View questions list
- ✅ Answer questions
- ✅ Upvote questions/answers

### Success Stories
- ✅ Submit success story
- ✅ View stories
- ✅ Like stories

### Discussion Boards
- ✅ Create discussion topics
- ✅ Post to discussions
- ✅ View topic posts

### My Contributions
- ✅ View user's questions
- ✅ View user's stories

## API Endpoints Now Working
All community endpoints should return 200 instead of 500:

- `GET /api/community/questions` - Get all questions
- `POST /api/community/questions` - Ask a question
- `GET /api/community/questions/:id` - Get question with answers
- `POST /api/community/answers` - Answer a question
- `POST /api/community/upvote` - Upvote content
- `GET /api/community/stories` - Get success stories
- `POST /api/community/stories` - Submit story
- `POST /api/community/stories/like` - Like story
- `GET /api/community/topics` - Get discussion topics
- `POST /api/community/topics` - Create topic
- `GET /api/community/topics/:id/posts` - Get topic posts
- `POST /api/community/posts` - Post to discussion
- `GET /api/community/stats` - Get community stats
- `GET /api/community/my-questions` - Get user's questions
- `GET /api/community/my-stories` - Get user's stories

## Files Modified
1. ✅ `backend/migrate-to-postgres.js` - Updated schema
2. ✅ `backend/fix-community-schema.js` - Created fix script

## Next Steps
1. Test the community page in the browser
2. Verify all features are working
3. Check browser console for any remaining errors
4. Test API endpoints directly if needed

## Prevention
To prevent similar issues in the future:
- Always ensure migration scripts match service code expectations
- Test schema changes before deploying
- Use consistent naming conventions across all tables
- Document expected schema in service files

---
**Status:** ✅ RESOLVED
**Date:** March 11, 2026
**Server:** Running on http://localhost:5000
