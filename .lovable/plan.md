

## Plan: Fix User Deletion and Clean Up Orphaned Auth User

### Overview
We need to fix the issue where users are only being deleted from application tables but not from the authentication system, and manually clean up the orphaned auth user.

### Technical Details

#### Problem Analysis
- The `admin-delete-user` edge function was created but may not have been properly deployed or called
- The AdminPanel component needs to ensure it's calling the edge function correctly
- The user `jamaur.jackson@gmail.com` (ID: `6fda0654-9b6c-403d-8c8a-21293f368dd5`) exists in auth.users but not in player_settings

#### Step 1: Verify AdminPanel Integration
Review the AdminPanel component to ensure:
- It correctly invokes the `admin-delete-user` edge function
- It passes the correct user ID (the auth user ID, not the player_settings ID)
- Error handling shows any issues to the admin

#### Step 2: Fix AdminPanel User ID Mapping
The AdminPanel fetches from `player_settings` which has its own `id` and a `user_id` column. We need to ensure:
- We're passing the `user_id` (auth user ID) to the edge function, not the table row `id`
- The edge function receives `targetUserId` as the auth.users ID

#### Step 3: Redeploy Edge Function
Ensure the `admin-delete-user` function is deployed and working properly.

#### Step 4: Clean Up Orphaned User
Call the edge function directly to delete the orphaned auth user `6fda0654-9b6c-403d-8c8a-21293f368dd5`.

### Files to Modify
1. **`src/components/AdminPanel.tsx`** - Verify/fix the user ID being passed to the delete function
2. **Test the `admin-delete-user` edge function** - Ensure it's deployed and call it to clean up the orphaned user

### Testing
1. Call the edge function to delete the orphaned user ID
2. Attempt to register with "jamaur.jackson@gmail.com" - should succeed
3. Test the full flow: create user → delete from admin panel → re-register with same email

