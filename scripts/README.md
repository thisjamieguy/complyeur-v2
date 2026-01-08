# Testing Scripts

## Endpoint Testing

This directory contains scripts for testing your application endpoints.

### Web UI Testing (Recommended)

The easiest way to test all endpoints is through the web interface:

1. Start your development server: `pnpm dev`
2. Navigate to: `http://localhost:3000/test-endpoints`
3. Use the interactive UI to test all server actions and API routes

### Command Line Testing

For automated testing or CI/CD, you can use the command-line script:

1. Install `tsx` (if not already installed):
   ```bash
   pnpm add -D tsx
   ```

2. Run the test script:
   ```bash
   pnpm tsx scripts/test-endpoints.ts
   ```

3. With custom credentials:
   ```bash
   pnpm tsx scripts/test-endpoints.ts --email test@example.com --password Test123!
   ```

### Available Endpoints

#### Server Actions (from `app/(auth)/actions.ts`)
- `login` - Authenticate user with email and password
- `signup` - Create new user account and company
- `forgotPassword` - Send password reset email
- `resetPassword` - Update user password
- `logout` - Sign out current user

#### API Routes
- `GET /auth/callback` - Auth callback handler for email confirmation and password reset

### Notes

- Server actions cannot be tested via HTTP requests directly - they must be called from React components
- The web UI at `/test-endpoints` is the best way to test server actions
- The command-line script can test API routes that accept HTTP requests
- Some endpoints may redirect, which is expected behavior


