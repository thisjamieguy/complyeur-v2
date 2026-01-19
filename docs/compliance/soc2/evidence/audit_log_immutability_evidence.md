Date: 2026-01-19
Environment: local

Commands executed:
```
docker exec -i supabase_db_complyeur psql -U postgres -d postgres -X -a -P pager=off <<'SQL'
\set ON_ERROR_STOP on

-- Insert company for audit_log foreign key
INSERT INTO companies (name, slug)
VALUES ('Audit Log Test Co', 'audit-log-test-' || substr(gen_random_uuid()::text, 1, 8))
RETURNING id \gset company_
\echo company_id=:company_id

-- Insert audit_log entry
INSERT INTO audit_log (
  company_id,
  user_id,
  action,
  entity_type,
  entity_id,
  details,
  ip_address,
  created_at
) VALUES (
  :'company_id',
  NULL,
  'TEST_INSERT',
  'company',
  gen_random_uuid(),
  '{"evidence": "soc2"}'::jsonb,
  '127.0.0.1',
  NOW()
)
RETURNING id \gset audit_
\echo audit_log_id=:audit_id

-- Prove SELECT works
SELECT id, company_id, action, entity_type, entity_id, created_at
FROM audit_log
WHERE id = :'audit_id';

\set ON_ERROR_STOP off

-- Prove UPDATE fails
UPDATE audit_log
SET action = 'TAMPERED'
WHERE id = :'audit_id';

-- Prove DELETE fails
DELETE FROM audit_log
WHERE id = :'audit_id';
SQL
```

Results observed:
```
\set ON_ERROR_STOP on
-- Insert company for audit_log foreign key
INSERT INTO companies (name, slug)
VALUES ('Audit Log Test Co', 'audit-log-test-' || substr(gen_random_uuid()::text, 1, 8))
RETURNING id \gset company_
INSERT 0 1
\echo company_id=:company_id
company_id=0f97c853-9fc8-43c9-b82a-89c7caa7a3f8
-- Insert audit_log entry
INSERT INTO audit_log (
  company_id,
  user_id,
  action,
  entity_type,
  entity_id,
  details,
  ip_address,
  created_at
) VALUES (
  :'company_id',
  NULL,
  'TEST_INSERT',
  'company',
  gen_random_uuid(),
  '{"evidence": "soc2"}'::jsonb,
  '127.0.0.1',
  NOW()
)
RETURNING id \gset audit_
INSERT 0 1
\echo audit_log_id=:audit_id
audit_log_id=826c4996-5086-4b51-a24c-2395a1db159a
-- Prove SELECT works
SELECT id, company_id, action, entity_type, entity_id, created_at
FROM audit_log
WHERE id = :'audit_id';
                  id                  |              company_id              |   action    | entity_type |              entity_id               |          created_at           
--------------------------------------+--------------------------------------+-------------+-------------+--------------------------------------+-------------------------------
 826c4996-5086-4b51-a24c-2395a1db159a | 0f97c853-9fc8-43c9-b82a-89c7caa7a3f8 | TEST_INSERT | company     | 0c607d7b-6dbc-482d-8779-5a617fdc77a3 | 2026-01-19 22:00:34.806729+00
(1 row)

\set ON_ERROR_STOP off
-- Prove UPDATE fails
UPDATE audit_log
SET action = 'TAMPERED'
WHERE id = :'audit_id';
-- Prove DELETE fails
DELETE FROM audit_log
WHERE id = :'audit_id';
ERROR:  audit_log is append-only
CONTEXT:  PL/pgSQL function prevent_audit_log_modifications() line 3 at RAISE
ERROR:  audit_log is append-only
CONTEXT:  PL/pgSQL function prevent_audit_log_modifications() line 3 at RAISE
```

| CC6.6 | SQL Evidence | docs/compliance/soc2/evidence/audit_log_immutability_evidence.md | audit_log append-only enforced and verified |