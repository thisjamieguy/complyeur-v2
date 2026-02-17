/**
 * Create a test user for E2E testing
 *
 * Usage: npx tsx scripts/create-test-user.ts
 *
 * This script creates a test user with a test company for E2E tests.
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set.
 */

import { createClient } from '@supabase/supabase-js';

const TEST_USER_EMAIL = 'e2e-test@complyeur.test';
const TEST_USER_PASSWORD = 'E2ETestPassword123!';
const TEST_COMPANY_NAME = 'E2E Test Company';

async function createTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
    console.error('\nMake sure these are set in your .env.local file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔧 Creating test user for E2E tests...\n');

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === TEST_USER_EMAIL);

    if (existingUser) {
      console.log('ℹ️  Test user already exists:', TEST_USER_EMAIL);
      console.log('   User ID:', existingUser.id);

      // Check if they have a profile and company
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', existingUser.id)
        .single();

      if (profile) {
        console.log('   Company:', profile.companies?.name || 'None');
        await ensureNonPrivilegedRole(supabase, existingUser.id);
        console.log('\n✅ Test user is ready to use!');
      } else {
        console.log('   ⚠️  No profile found, creating one...');
        await setupUserProfile(supabase, existingUser.id);
      }

      printCredentials();
      return;
    }

    // Create the user
    console.log('📝 Creating new user:', TEST_USER_EMAIL);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('❌ Failed to create user:', authError.message);
      process.exit(1);
    }

    console.log('   User ID:', authData.user.id);

    // Set up profile and company
    await setupUserProfile(supabase, authData.user.id);

    console.log('\n✅ Test user created successfully!');
    printCredentials();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function setupUserProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  // Create test company
  console.log('🏢 Creating test company:', TEST_COMPANY_NAME);
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: TEST_COMPANY_NAME, slug: 'e2e-test-company' })
    .select()
    .single();

  if (companyError) {
    // Company might already exist, try to find it
    const { data: existingCompany } = await supabase
      .from('companies')
      .select()
      .eq('name', TEST_COMPANY_NAME)
      .single();

    if (!existingCompany) {
      console.error('❌ Failed to create company:', companyError.message);
      process.exit(1);
    }

    console.log('   Using existing company');
    await linkUserToCompany(supabase, userId, existingCompany.id);
    return;
  }

  console.log('   Company ID:', company.id);
  await linkUserToCompany(supabase, userId, company.id);
}

async function ensureNonPrivilegedRole(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: profile, error: profileReadError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileReadError) {
    console.error('❌ Failed to read existing profile role:', profileReadError.message);
    process.exit(1);
  }

  if (!profile) {
    return;
  }

  if (profile.role !== 'manager') {
    console.log(`   Updating role from "${profile.role}" to "manager" (MFA not required)...`);
    const { error: roleUpdateError } = await supabase
      .from('profiles')
      .update({ role: 'manager' })
      .eq('id', userId);

    if (roleUpdateError) {
      console.error('❌ Failed to update user role:', roleUpdateError.message);
      process.exit(1);
    }
  }
}

async function linkUserToCompany(supabase: ReturnType<typeof createClient>, userId: string, companyId: string) {
  // Create or update profile
  console.log('👤 Setting up user profile...');
  let { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      company_id: companyId,
      role: 'manager', // Use manager to avoid MFA requirement (admin requires MFA)
      full_name: 'E2E Test User',
    });

  // Some environments may not have full_name in schema cache yet.
  if (profileError?.message?.includes("'full_name' column")) {
    const fallback = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        company_id: companyId,
        role: 'manager', // Use manager to avoid MFA requirement (admin requires MFA)
      });
    profileError = fallback.error;
  }

  if (profileError) {
    console.error('❌ Failed to create profile:', profileError.message);
    process.exit(1);
  }

  // Enable bulk import entitlement for testing
  console.log('🔓 Enabling bulk import entitlement...');
  const { error: entitlementError } = await supabase
    .from('company_entitlements')
    .upsert({
      company_id: companyId,
      can_bulk_import: true,
    });

  if (entitlementError) {
    console.warn('⚠️  Could not set entitlements:', entitlementError.message);
    console.warn('   Import tests may fail without bulk import permission');
  }
}

function printCredentials() {
  console.log('\n' + '='.repeat(50));
  console.log('Test Credentials for E2E Tests:');
  console.log('='.repeat(50));
  console.log(`TEST_USER_EMAIL=${TEST_USER_EMAIL}`);
  console.log(`TEST_USER_PASSWORD=${TEST_USER_PASSWORD}`);
  console.log('='.repeat(50));
  console.log('\nTo run tests with these credentials:');
  console.log(`export TEST_USER_EMAIL="${TEST_USER_EMAIL}"`);
  console.log(`export TEST_USER_PASSWORD="${TEST_USER_PASSWORD}"`);
  console.log('npm run test:e2e:import');
  console.log('\nOr add to .env.local:');
  console.log(`TEST_USER_EMAIL=${TEST_USER_EMAIL}`);
  console.log(`TEST_USER_PASSWORD=${TEST_USER_PASSWORD}`);
}

createTestUser();
