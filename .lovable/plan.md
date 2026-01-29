
## Add Phone Number or Email Authentication

Allow users to sign up and log in using either their phone number or email address, both with a regular password. This provides flexibility for users (especially younger players) who may not have email addresses.

---

### How It Will Work

**Sign Up Flow:**
1. User picks their preferred method: "Email" or "Phone Number"
2. Enters their chosen identifier (email or phone) + password + username
3. Account is created and they can log in immediately

**Login Flow:**
1. User picks "Email" or "Phone Number" 
2. Enters their identifier + password
3. Signs in normally

---

### What Will Change

**Login Screen Updates:**
- Add toggle buttons to switch between "Email" and "Phone Number" modes
- Phone input with formatting (e.g., +1 555-123-4567)
- Same password-based authentication for both methods

**Database Changes:**
- Add `phone` column to `player_settings` table to store user's phone number for display/contact purposes

---

### Technical Details

**Files to Modify:**

1. **`src/components/AuthForm.tsx`**
   - Add `authMethod` state: `'email' | 'phone'`
   - Add toggle buttons/tabs at the top of the form
   - Conditionally render email input OR phone input based on selection
   - Add phone number validation (format: +1XXXXXXXXXX)
   - Update `handleSubmit` to use phone-based auth when phone is selected

2. **`src/hooks/useAuth.tsx`**
   - Update `signUp` function signature to accept either email or phone
   - Update `signIn` function signature to accept either email or phone
   - Use Supabase's phone field in auth calls:
     ```typescript
     // For phone signup
     supabase.auth.signUp({
       phone: '+15551234567',
       password: 'password123'
     })
     
     // For phone login
     supabase.auth.signInWithPassword({
       phone: '+15551234567',
       password: 'password123'
     })
     ```

3. **Database Migration**
   - Add optional `phone` column to `player_settings` table:
     ```sql
     ALTER TABLE player_settings 
     ADD COLUMN phone text;
     ```

**Phone Number Validation:**
- Accept formats like: (555) 123-4567, 555-123-4567, 5551234567
- Normalize to E.164 format (+1XXXXXXXXXX) before sending to Supabase
- Show helpful formatting hints to users

---

### User Experience

The auth form will look like this:

```text
┌─────────────────────────────────────┐
│         [Hoop Journal Logo]         │
│      Sign in to track your season   │
│                                     │
│   ┌──────────┐ ┌──────────────┐    │
│   │  Email   │ │ Phone Number │    │
│   └──────────┘ └──────────────┘    │
│                                     │
│   Email / Phone Number              │
│   ┌─────────────────────────────┐   │
│   │ you@example.com             │   │
│   └─────────────────────────────┘   │
│                                     │
│   Password                          │
│   ┌─────────────────────────────┐   │
│   │ ••••••••                    │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │          Sign In            │   │
│   └─────────────────────────────┘   │
│                                     │
│   Don't have an account? Sign up    │
└─────────────────────────────────────┘
```

---

### Important Notes

- Phone auth with password (no SMS OTP) is fully supported by the authentication system
- No additional costs - this uses password authentication, not SMS verification
- Users who sign up with phone cannot use "Forgot Password" email feature - they would need admin reset
- The admin password reset feature will continue to work for all users
