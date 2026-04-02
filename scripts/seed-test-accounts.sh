#!/bin/bash
# Seed 5 test company accounts for local admin development.
# Run: bash scripts/seed-test-accounts.sh
# Requires: local Supabase running (supabase start)

set -e

SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(supabase status -o json 2>/dev/null | grep service_role_key | cut -d'"' -f4)}"
API_URL="http://localhost:54321"
# Local Postgres (docker): postgresql://postgres:postgres@localhost:54322/postgres — use with psql if needed
PASSWORD="Password123!"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }

get_or_create_user() {
  local email=$1 company=$2 first=$3 last=$4

  # Check if user already exists
  local existing
  existing=$(curl -s "$API_URL/auth/v1/admin/users?email=$email" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -n "$existing" ]; then
    echo "$existing"
    return
  fi

  # Create new user
  curl -s -X POST "$API_URL/auth/v1/admin/users" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$PASSWORD\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"company_name\": \"$company\",
        \"given_name\": \"$first\",
        \"family_name\": \"$last\",
        \"full_name\": \"$first $last\"
      }
    }" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

run_sql() {
  docker exec -i supabase_db_complyeur psql -U postgres -d postgres <<< "$1" 2>&1
}

echo ""
info "Creating 5 test company accounts..."
echo ""

# --- 1. TechVentures Ltd (Pro tier) ---
info "Creating TechVentures Ltd..."
ID1=$(get_or_create_user "sarah.chen@techventures.co.uk" "TechVentures Ltd" "Sarah" "Chen")
[ -z "$ID1" ] && echo "Failed to create user 1" && exit 1
log "sarah.chen@techventures.co.uk (ID: $ID1)"

# --- 2. BlueSky Consulting (Basic/free tier) ---
info "Creating BlueSky Consulting..."
ID2=$(get_or_create_user "marcus.webb@blueskyconsulting.co.uk" "BlueSky Consulting" "Marcus" "Webb")
[ -z "$ID2" ] && echo "Failed to create user 2" && exit 1
log "marcus.webb@blueskyconsulting.co.uk (ID: $ID2)"

# --- 3. Capitol Solutions (Pro+ tier) ---
info "Creating Capitol Solutions..."
ID3=$(get_or_create_user "anna.brown@capitolsolutions.co.uk" "Capitol Solutions" "Anna" "Brown")
[ -z "$ID3" ] && echo "Failed to create user 3" && exit 1
log "anna.brown@capitolsolutions.co.uk (ID: $ID3)"

# --- 4. DataBridge UK (Basic/free tier, suspended) ---
info "Creating DataBridge UK..."
ID4=$(get_or_create_user "tom.rivers@databridge.co.uk" "DataBridge UK" "Tom" "Rivers")
[ -z "$ID4" ] && echo "Failed to create user 4" && exit 1
log "tom.rivers@databridge.co.uk (ID: $ID4)"

# --- 5. Meridian Travel (Pro tier, trial expired) ---
info "Creating Meridian Travel..."
ID5=$(get_or_create_user "elena.okafor@meridiantravel.co.uk" "Meridian Travel" "Elena" "Okafor")
[ -z "$ID5" ] && echo "Failed to create user 5" && exit 1
log "elena.okafor@meridiantravel.co.uk (ID: $ID5)"

echo ""
info "Waiting for triggers to settle..."
sleep 2

echo ""
info "Updating entitlements and adding sample data..."

run_sql "
-- ── Tier overrides ──────────────────────────────────────────────────────────
-- TechVentures: Pro tier, active trial
UPDATE public.company_entitlements
SET
  tier_slug        = 'starter',
  max_employees    = 50,
  max_users        = 5,
  can_export_csv   = true,
  can_export_pdf   = true,
  can_forecast     = true,
  can_calendar     = true,
  can_bulk_import  = false,
  is_trial         = true,
  trial_ends_at    = NOW() + INTERVAL '10 days'
WHERE company_id = (
  SELECT company_id FROM public.profiles WHERE id = '$ID1'
);

-- Capitol Solutions: Pro+ tier, paying
UPDATE public.company_entitlements
SET
  tier_slug        = 'professional',
  max_employees    = 200,
  max_users        = 15,
  can_export_csv   = true,
  can_export_pdf   = true,
  can_forecast     = true,
  can_calendar     = true,
  can_bulk_import  = true,
  is_trial         = false,
  trial_ends_at    = NULL
WHERE company_id = (
  SELECT company_id FROM public.profiles WHERE id = '$ID3'
);

-- DataBridge: Basic tier, suspended
UPDATE public.company_entitlements
SET
  tier_slug        = 'free',
  is_trial         = false,
  trial_ends_at    = NULL,
  is_suspended     = true,
  suspended_at     = NOW() - INTERVAL '5 days',
  suspended_reason = 'Payment overdue'
WHERE company_id = (
  SELECT company_id FROM public.profiles WHERE id = '$ID4'
);

-- Meridian Travel: Pro tier, trial expired
UPDATE public.company_entitlements
SET
  tier_slug        = 'starter',
  max_employees    = 50,
  max_users        = 5,
  can_export_csv   = true,
  can_export_pdf   = true,
  can_forecast     = true,
  can_calendar     = true,
  is_trial         = true,
  trial_ends_at    = NOW() - INTERVAL '3 days'
WHERE company_id = (
  SELECT company_id FROM public.profiles WHERE id = '$ID5'
);

-- ── Employees ───────────────────────────────────────────────────────────────
-- TechVentures: 5 employees
INSERT INTO public.employees (company_id, first_name, last_name, email, nationality_type) VALUES
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'), 'James',  'Harrington', 'j.harrington@techventures.co.uk', 'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'), 'Priya',  'Mehta',      'p.mehta@techventures.co.uk',      'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'), 'Lucas',  'Dupont',     'l.dupont@techventures.co.uk',     'rest_of_world'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'), 'Sophie', 'Williams',   's.williams@techventures.co.uk',   'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'), 'Kai',    'Nakamura',   'k.nakamura@techventures.co.uk',   'rest_of_world');

-- BlueSky: 3 employees
INSERT INTO public.employees (company_id, first_name, last_name, email, nationality_type) VALUES
  ((SELECT company_id FROM public.profiles WHERE id = '$ID2'), 'Oliver', 'Bennett',  'o.bennett@blueskyconsulting.co.uk',  'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID2'), 'Amara',  'Osei',     'a.osei@blueskyconsulting.co.uk',     'rest_of_world'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID2'), 'Lena',   'Schulz',   'l.schulz@blueskyconsulting.co.uk',   'eu_schengen_citizen');

-- Capitol Solutions: 8 employees
INSERT INTO public.employees (company_id, first_name, last_name, email, nationality_type) VALUES
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'Edward',   'Clark',    'e.clark@capitolsolutions.co.uk',    'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'Fatima',   'Al-Rashid','f.alrashid@capitolsolutions.co.uk', 'rest_of_world'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'George',   'Peterson', 'g.peterson@capitolsolutions.co.uk', 'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'Hannah',   'Vogel',    'h.vogel@capitolsolutions.co.uk',    'eu_schengen_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'Ibrahim',  'Hassan',   'i.hassan@capitolsolutions.co.uk',   'rest_of_world'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'Jessica',  'Park',     'j.park@capitolsolutions.co.uk',     'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'Kevin',    'Murphy',   'k.murphy@capitolsolutions.co.uk',   'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'), 'Layla',    'Mansouri', 'l.mansouri@capitolsolutions.co.uk', 'rest_of_world');

-- DataBridge: 2 employees
INSERT INTO public.employees (company_id, first_name, last_name, email, nationality_type) VALUES
  ((SELECT company_id FROM public.profiles WHERE id = '$ID4'), 'Nathan', 'Cole',   'n.cole@databridge.co.uk',   'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID4'), 'Olivia', 'Fisher', 'o.fisher@databridge.co.uk', 'uk_citizen');

-- Meridian Travel: 6 employees
INSERT INTO public.employees (company_id, first_name, last_name, email, nationality_type) VALUES
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'), 'Patrick',  'O Brien',   'p.obrien@meridiantravel.co.uk',   'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'), 'Qing',     'Li',         'q.li@meridiantravel.co.uk',        'rest_of_world'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'), 'Rachel',   'Evans',      'r.evans@meridiantravel.co.uk',     'uk_citizen'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'), 'Samuel',   'Okonkwo',    's.okonkwo@meridiantravel.co.uk',   'rest_of_world'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'), 'Tanya',    'Petrov',     't.petrov@meridiantravel.co.uk',    'rest_of_world'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'), 'Usman',    'Malik',      'u.malik@meridiantravel.co.uk',     'uk_citizen');

-- ── Trips ─────────────────────────────────────────────────────────────────
-- TechVentures trips (mix of compliant + near-warning)
INSERT INTO public.trips (company_id, employee_id, entry_date, exit_date, country) VALUES
  -- James: 30 days recent (safe)
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'),
   (SELECT id FROM public.employees WHERE email = 'j.harrington@techventures.co.uk'),
   '2025-11-01', '2025-11-30', 'DE'),
  -- Priya: 70 days spread across window (warning territory)
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'),
   (SELECT id FROM public.employees WHERE email = 'p.mehta@techventures.co.uk'),
   '2025-09-01', '2025-10-10', 'FR'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'),
   (SELECT id FROM public.employees WHERE email = 'p.mehta@techventures.co.uk'),
   '2025-12-01', '2025-12-28', 'FR'),
  -- Lucas: 92 days (breach)
  ((SELECT company_id FROM public.profiles WHERE id = '$ID1'),
   (SELECT id FROM public.employees WHERE email = 'l.dupont@techventures.co.uk'),
   '2025-08-01', '2025-10-31', 'NL');

-- Capitol Solutions trips (heavier usage, some violations)
INSERT INTO public.trips (company_id, employee_id, entry_date, exit_date, country) VALUES
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'),
   (SELECT id FROM public.employees WHERE email = 'e.clark@capitolsolutions.co.uk'),
   '2025-10-01', '2025-11-15', 'ES'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'),
   (SELECT id FROM public.employees WHERE email = 'f.alrashid@capitolsolutions.co.uk'),
   '2025-07-01', '2025-09-28', 'IT'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID3'),
   (SELECT id FROM public.employees WHERE email = 'g.peterson@capitolsolutions.co.uk'),
   '2025-11-01', '2026-01-15', 'DE');

-- Meridian Travel trips
INSERT INTO public.trips (company_id, employee_id, entry_date, exit_date, country) VALUES
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'),
   (SELECT id FROM public.employees WHERE email = 'p.obrien@meridiantravel.co.uk'),
   '2025-12-01', '2026-01-30', 'FR'),
  ((SELECT company_id FROM public.profiles WHERE id = '$ID5'),
   (SELECT id FROM public.employees WHERE email = 'q.li@meridiantravel.co.uk'),
   '2025-10-15', '2025-12-20', 'ES');
"

echo ""
log "Done! 5 test accounts created."
echo ""
echo "  Email                                    Password       Company"
echo "  ──────────────────────────────────────── ────────────── ──────────────────────"
echo "  sarah.chen@techventures.co.uk            $PASSWORD   TechVentures Ltd   (Pro)"
echo "  marcus.webb@blueskyconsulting.co.uk      $PASSWORD   BlueSky Consulting (Basic)"
echo "  anna.brown@capitolsolutions.co.uk        $PASSWORD   Capitol Solutions  (Pro+)"
echo "  tom.rivers@databridge.co.uk              $PASSWORD   DataBridge UK      (Basic, suspended)"
echo "  elena.okafor@meridiantravel.co.uk        $PASSWORD   Meridian Travel    (Pro, trial expired)"
echo ""
echo "  Local Supabase Studio: http://localhost:54323"
echo ""
