

## Add User Feedback System

Create a feedback button in the Settings tab that allows all users to submit feedback about Hoop Journal, which will appear in a new "Feedback" tab in the Admin Panel.

---

### How It Will Work

**User Flow:**
1. User goes to Settings tab
2. Clicks "Send Feedback" button
3. A dialog opens where they can type their feedback and optionally select a category
4. Submits feedback and sees a success confirmation
5. Feedback is stored in the database for admin review

**Admin Flow:**
1. Admin sees a new "Feedback" tab in the Admin Panel (with badge showing unread count)
2. Views list of user feedback with user info, category, and timestamp
3. Can mark feedback as "read" or "addressed"
4. Can add admin notes for internal tracking

---

### What Will Change

**Database:**
- New `user_feedback` table to store feedback submissions

**Settings Panel:**
- Add a "Send Feedback" button at the bottom
- Trigger a dialog for submitting feedback

**Admin Panel:**
- New "Feedback" tab with badge counter for unread items
- UI to view and manage feedback submissions

**New Component:**
- `FeedbackDialog.tsx` - reusable feedback form dialog

---

### Technical Details

**Database Migration:**
```sql
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text DEFAULT 'general',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback
CREATE POLICY "Users can create feedback"
ON public.user_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.user_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.user_feedback FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update feedback
CREATE POLICY "Admins can update feedback"
ON public.user_feedback FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.user_feedback FOR DELETE
USING (has_role(auth.uid(), 'admin'));
```

**Files to Create:**

1. **`src/components/FeedbackDialog.tsx`**
   - Dialog with category select (Bug Report, Feature Request, General Feedback, Other)
   - Textarea for message (with character limit guidance)
   - Submit button that inserts into `user_feedback` table
   - Success confirmation toast

**Files to Modify:**

2. **`src/components/SettingsPanel.tsx`**
   - Import and render `FeedbackDialog` component
   - Add a styled "Send Feedback" button section below the Save Profile button
   - Include icon and descriptive text encouraging feedback

3. **`src/components/AdminPanel.tsx`**
   - Add `userFeedback` state and fetch from database
   - Add new "Feedback" tab to TabsList with MessageSquare icon
   - Add badge counter showing unread feedback count
   - Create Feedback tab content with cards for each submission
   - Add ability to update status (unread/read/addressed) and add notes
   - Update stats overview to include feedback metrics

---

### User Interface Preview

**Settings Panel - Feedback Section:**
```text
┌─────────────────────────────────────────────────┐
│  [Save Profile Button]                          │
│                                                 │
│  ────────────────────────────────────────────── │
│                                                 │
│  💬 Have feedback?                              │
│  Help us improve Hoop Journal by sharing your   │
│  thoughts, ideas, or reporting bugs.            │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │          📝 Send Feedback                 │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Feedback Dialog:**
```text
┌─────────────────────────────────────────────────┐
│  Share Your Feedback                        [X] │
│  ─────────────────────────────────────────────  │
│  Help us make Hoop Journal better!              │
│                                                 │
│  Category                                       │
│  ┌─────────────────────────────────────────┐    │
│  │ General Feedback                    ▼   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Your Feedback                                  │
│  ┌─────────────────────────────────────────┐    │
│  │                                         │    │
│  │                                         │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────┐ ┌───────────────────────────┐  │
│  │   Cancel    │ │     Submit Feedback       │  │
│  └─────────────┘ └───────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Admin Panel - Feedback Tab:**
```text
┌─────────────────────────────────────────────────┐
│ [Users] [Reports] [Password] [Feedback 3] [...] │
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ 🔵 UNREAD │ Jan 29, 2026                  │   │
│ │───────────────────────────────────────────│   │
│ │ Category: Feature Request                 │   │
│ │ User: Johnny Basketball                   │   │
│ │───────────────────────────────────────────│   │
│ │ "It would be cool to have a way to        │   │
│ │  compare my stats with friends!"          │   │
│ │───────────────────────────────────────────│   │
│ │ [Mark as Read] [Mark as Addressed]        │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

### Feedback Categories

Users can choose from these categories when submitting feedback:
- **General Feedback** - Overall thoughts about the app
- **Feature Request** - Ideas for new features
- **Bug Report** - Something isn't working correctly
- **Other** - Anything else

---

### Validation & Security

- Message is required and limited to 1000 characters
- Category defaults to "general" if not selected
- RLS ensures users can only create/view their own feedback
- Only admins can view all feedback and update status
- Input is validated before database insertion

