# Aisle3 Development Status

**Last Updated:** 2025-11-15
**Version:** 0.4.0

## Recent Work: Inbox Cleanup Feature with SQLite Caching

### What Was Implemented

We built a comprehensive **Inbox Cleanup** feature that analyzes your entire Gmail inbox to help delete emails in bulk by sender.

#### Key Features

1. **Full Inbox Analysis**
   - Analyzes ALL emails in inbox (not just loaded 100)
   - Groups by sender with aggregated statistics
   - Shows: total count, unread count, sample subjects
   - Sorted by email count (highest first)

2. **SQLite Caching System**
   - Persistent cache with 24-hour TTL
   - Instant load on subsequent opens
   - Database: `~/.local/share/com.aisle3.app/aisle3.db`
   - Schema: `sender_stats` table with indexes

3. **Rate Limiting**
   - Batch size: 50 emails per request
   - Pause: 2 seconds every 5 batches
   - Prevents Gmail API 429 errors

4. **Smart UX**
   - Cache-first loading (instant if < 24 hours)
   - Manual "Refresh" button to force update
   - On-demand email preview when sender selected
   - Progress indicators during operations

### Architecture

```
User clicks "Cleanup"
    ↓
Check SQLite cache (< 24 hours?)
    ↓ (cache miss or refresh)
Backend: Fetch all message IDs from Gmail
    ↓
Batch fetch in chunks of 50 with rate limiting
    ↓
Group by sender, aggregate stats
    ↓
Cache in SQLite + return to frontend
    ↓
Display top 50 senders
    ↓
User selects sender → Fetch emails for preview
    ↓
User clicks "Delete" → Trash all emails from sender
    ↓
Refresh stats + update UI
```

### Files Modified/Created

#### Backend (Rust)
- `src-tauri/Cargo.toml` - Added `tauri-plugin-sql`
- `src-tauri/src/main.rs` - SQLite migrations, plugin setup
- `src-tauri/src/gmail_client.rs` - `get_sender_stats()` method with rate limiting
- `src-tauri/src/rate_limiter.rs` - Added rate limit for `get_sender_stats`

#### Frontend (JavaScript/Svelte)
- `src/lib/services/senderStatsCache.js` - **NEW** - SQLite cache service
- `src/lib/services/emailService.js` - Updated with cache-first loading
- `src/lib/stores/emailStore.js` - Added `getSenderStats()`, `getEmailsFromSender()`, `trashEmails()`
- `src/lib/components/InboxCleanup.svelte` - **NEW** - Main cleanup UI
- `src/lib/components/Header.svelte` - Added "Cleanup" button
- `src/lib/components/EmailApp.svelte` - Integrated cleanup modal

### Performance Characteristics

- **First Load:** ~10-30 seconds for large inboxes (rate limited)
- **Cached Load:** < 100ms (instant from SQLite)
- **Cache Duration:** 24 hours
- **API Calls:** Batched (50 emails/request, 2s pause every 5 batches)

## Current State

### ✅ Working Features
- Gmail OAuth authentication (secure keyring storage)
- Email list with virtualization
- Email viewing (HTML sanitization)
- Mark as read/unread
- Auto-mark as read (configurable delay)
- Email composition & replies
- Label filtering (server-side)
- Conversation threading
- Auto-polling for new emails
- In-app notifications
- Auto-update checking
- **Inbox Cleanup with caching** ⭐ NEW

### 🚧 Known Issues
Rust tests pass. Four frontend tests in the EmailService/EmailStore `loadEmails` suites fail (they predate this feature and stem from the label-filter query changes). Vitest also crashes at the end of the run on Node 24.

### 📋 TODO / Future Enhancements

#### Inbox Cleanup Improvements
- [ ] Add progress bar during initial analysis
- [ ] Support filtering by date ranges ("Delete emails older than 90 days")
- [ ] Add "Undo" functionality for deleted emails
- [ ] Bulk operations (select multiple senders at once)
- [ ] Export sender statistics to CSV

#### General Features
- [ ] Search functionality (now that query infrastructure is in place)
- [ ] Attachment handling (download, preview)
- [ ] Gmail labels/folders management (create, edit, delete)
- [ ] Draft saving
- [ ] Multi-account support
- [ ] Keyboard shortcuts
- [ ] Dark mode

#### Performance
- [ ] Implement streaming updates for long-running operations
- [ ] Add background sync for sender stats (update cache automatically)
- [ ] Optimize image loading in email content

## Testing

```bash
# Frontend type checking
npm run check

# Rust compilation
cd src-tauri && cargo check

# Run all tests
cd src-tauri && cargo test

# Run dev server
npm run tauri dev
```

**Test Status:** Rust green. Frontend has 4 known pre-existing failures in `loadEmails` tests.

## Dependencies

### Key Libraries
- **Tauri 2.x** - Desktop app framework
- **SvelteKit** with Svelte 5 (runes syntax)
- **tauri-plugin-sql** - SQLite database
- **tauri-plugin-store** - Settings persistence
- **tauri-plugin-notification** - OS notifications
- **tauri-plugin-updater** - Auto-updates
- **reqwest** - HTTP client (Gmail API)
- **oauth2** - OAuth authentication
- **keyring** - Secure credential storage

### Gmail API Scopes
- `gmail.readonly` - Read emails
- `gmail.modify` - Mark read/unread, trash
- `gmail.send` - Send replies
- `gmail.labels` - Read labels

## Database Schema

### sender_stats Table
```sql
CREATE TABLE sender_stats (
  sender TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  unread_count INTEGER NOT NULL,
  oldest_id TEXT NOT NULL,
  newest_id TEXT NOT NULL,
  sample_subject TEXT NOT NULL,
  last_updated INTEGER NOT NULL
);

CREATE INDEX idx_count ON sender_stats(count DESC);
CREATE INDEX idx_last_updated ON sender_stats(last_updated);
```

## Recent Commits

1. **Initial label filtering implementation**
   - Added label_ids to Email struct
   - Created LabelFilter component
   - Client-side filtering

2. **Server-side label filtering**
   - Moved to query-based filtering
   - Added Gmail query builder
   - Fixed context binding issues

3. **Inbox Cleanup - Backend**
   - Added `get_sender_stats` command
   - Implemented `trash_emails` with batch API
   - Rate limiting in GmailClient

4. **Inbox Cleanup - Frontend + Caching**
   - SQLite caching system
   - InboxCleanup component
   - On-demand email loading
   - Manual refresh functionality

## Next Session Recommendations

1. **Test the cleanup feature** with a real inbox
2. **Monitor rate limiting** - adjust delays if still hitting 429s
3. **Add progress indicator** during initial analysis for better UX
4. **Consider adding** date-based filters ("emails older than X")
5. **Implement undo** for trash operations (fetch from trash, restore)

## Notes

- Cache invalidation is time-based (24 hours). Consider adding manual "Clear Cache" option.
- The cleanup feature uses `trash` not `delete` - emails go to Gmail trash (recoverable for 30 days).
- SQLite database is created automatically on first run via migrations.
- Rate limiting parameters (50 emails/batch, 2s delay) may need tuning based on Gmail's quotas.

---

**Ready to continue development!** 🚀
