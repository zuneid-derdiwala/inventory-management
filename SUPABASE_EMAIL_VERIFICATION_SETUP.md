# Supabase Email Verification Setup

This guide explains how to configure Supabase to require email verification before users can log in.

## Critical Supabase Settings

### 1. Enable Email Confirmation

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Settings** (or **Auth** → **Settings**)
4. Find the **Email Auth** section
5. **Enable "Enable email confirmations"** - This is the most important setting
6. Make sure **"Enable email signup"** is also enabled

### 2. Configure Email Templates

1. In the same **Authentication** → **Settings** page
2. Go to **Email Templates** section
3. Configure the **Confirm signup** template
4. Make sure the redirect URL includes your verification route:
   ```
   {{ .SiteURL }}/verify-email
   ```

### 3. Site URL Configuration

1. In **Authentication** → **Settings**
2. Find **Site URL** field
3. Set it to your application URL:
   - Development: `http://localhost:8080` (or your dev port)
   - Production: `https://yourdomain.com`
4. Add your redirect URLs in **Redirect URLs**:
   - `http://localhost:8080/verify-email`
   - `https://yourdomain.com/verify-email`

### 4. Email Provider Setup

If you're using a custom SMTP provider:
1. Go to **Project Settings** → **Auth**
2. Configure your SMTP settings
3. Test the email sending

## What the Code Does

The application code enforces email verification by:

1. **Sign In Check**: The `signIn` function checks if email is verified before allowing login
2. **Session Check**: The `onAuthStateChange` handler signs out unverified users
3. **Protected Routes**: The `ProtectedRoute` component redirects unverified users to login
4. **Initial Session**: On app load, unverified users are automatically signed out

## Testing

After configuring Supabase:

1. Try to sign up with a new account
2. Check your email for the verification link
3. Try to log in **without** verifying - you should be blocked
4. Verify your email using the link
5. Try to log in again - it should work

## Troubleshooting

### Users can still log in without verification

**Check:**
- Is "Enable email confirmations" enabled in Supabase?
- Are you testing with a newly created account?
- Check the browser console for any errors

**Solution:**
- Make sure email confirmations are enabled in Supabase dashboard
- Clear browser cache and cookies
- Try with a fresh account

### Verification emails not being sent

**Check:**
- SMTP settings in Supabase
- Email provider configuration
- Spam folder
- Supabase email logs (Dashboard → Logs → Auth)

### Verification link not working

**Check:**
- Site URL is correctly set
- Redirect URLs include `/verify-email`
- The link hasn't expired (usually 24 hours)

## Important Notes

- **Email confirmation must be enabled in Supabase** - This is the most critical setting
- The code enforces verification, but Supabase must also be configured correctly
- Unverified users will be automatically signed out when they try to access protected routes
- Users can only access `/signup` and `/verify-email` pages without verification


