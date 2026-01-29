

## Password Reset Request System for Phone Users

Enable phone users to request password resets directly from the Forgot Password dialog, which will send a notification to admins in the Admin tab.

---

### How It Will Work

**User Flow:**
1. Phone user clicks "Forgot Password?" on login screen
2. Selects "Phone" tab and enters their phone number
3. Clicks "Request Password Reset"
4. Sees confirmation message that their request has been sent to an admin
5. Admin handles the reset from their dashboard

**Admin Flow:**
1. Admin sees a new "Password Requests" tab in the Admin Panel (with badge showing pending count)
2. Views list of pending reset requests with user info and phone number
3. Clicks to approve - generates a temporary password and sets it for the user
4. User is notified of their new temporary password (displayed to admin to share with user)

---

### What Will Change

**Database:**
- New `password_reset_requests` table to store requests from phone users

**Admin Panel Updates:**
- New "Password Requests" tab showing pending requests
- Badge counter for pending requests (similar to Content Reports)
- Ability to approve/deny requests
- Direct password reset functionality for phone users

**Forgot Password Dialog:**
- Add phone number input field in Phone tab
- Submit button to create reset request
- Success confirmation message

---

### Technical Details

**Database Migration:**
```sql
CREATE TABLE password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  player_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Users can create requests (for their own account)
CREATE POLICY "Anyone can create reset requests"
ON password_reset_requests FOR INSERT
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON password_reset_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update requests"
ON password_reset_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete requests
CREATE POLICY "Admins can delete requests"
ON password_reset_requests FOR DELETE
USING (has_role(auth.uid(), 'admin'));
```

**Files to Modify:**

1. **`src/components/ForgotPasswordDialog.tsx`**
   - Add state for phone number input and request submission
   - Add form for phone users to enter their phone number
   - Submit creates a record in `password_reset_requests` table
   - Show success message after submission

2. **`src/components/AdminPanel.tsx`**
   - Add new state for password reset requests
   - Fetch `password_reset_requests` data alongside users and reports
   - Add new "Password Requests" tab with badge counter
   - Add UI to view requests and take action
   - Add function to directly set a new password via the admin-password-reset edge function

3. **`supabase/functions/admin-password-reset/index.ts`**
   - Add support for directly setting a password (for phone users without email)
   - Accept optional `newPassword` parameter
   - Use `updateUserById` to set password directly when provided

---

### Security Considerations

- The new password will be generated on the admin side and must be communicated to the user out-of-band (phone call, in person, etc.)
- RLS ensures only admins can view/modify reset requests
- The edge function already verifies admin role before allowing password operations

