BEGIN;

CREATE OR REPLACE FUNCTION public.purge_expired_gdpr_audit_logs(retention_days integer DEFAULT 90)
RETURNS TABLE (
  company_id uuid,
  deleted_rows integer,
  purged_through timestamptz,
  chain_start_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  cutoff timestamptz := now() - make_interval(days => retention_days);
  company_row record;
  last_purged_row record;
  rows_to_delete integer;
BEGIN
  IF retention_days < 1 THEN
    RAISE EXCEPTION 'retention_days must be at least 1';
  END IF;

  FOR company_row IN
    SELECT DISTINCT al.company_id
    FROM public.audit_log al
    WHERE al.created_at < cutoff
  LOOP
    SELECT al.id, al.entry_hash, al.created_at
    INTO last_purged_row
    FROM public.audit_log al
    WHERE al.company_id = company_row.company_id
      AND al.created_at < cutoff
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT 1;

    IF last_purged_row.id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*)::integer
    INTO rows_to_delete
    FROM public.audit_log al
    WHERE al.company_id = company_row.company_id
      AND (
        al.created_at < last_purged_row.created_at
        OR (al.created_at = last_purged_row.created_at AND al.id <= last_purged_row.id)
      );

    IF rows_to_delete = 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.gdpr_audit_retention_checkpoints (
      company_id,
      chain_start_hash,
      purged_through,
      deleted_rows,
      created_at,
      updated_at
    )
    VALUES (
      company_row.company_id,
      last_purged_row.entry_hash,
      last_purged_row.created_at,
      rows_to_delete,
      now(),
      now()
    )
    ON CONFLICT ON CONSTRAINT gdpr_audit_retention_checkpoints_pkey DO UPDATE
      SET chain_start_hash = EXCLUDED.chain_start_hash,
          purged_through = EXCLUDED.purged_through,
          deleted_rows = public.gdpr_audit_retention_checkpoints.deleted_rows + EXCLUDED.deleted_rows,
          updated_at = now();

    BEGIN
      PERFORM set_config('app.gdpr_audit_retention_purge', 'on', true);

      DELETE FROM public.audit_log al
      WHERE al.company_id = company_row.company_id
        AND (
          al.created_at < last_purged_row.created_at
          OR (al.created_at = last_purged_row.created_at AND al.id <= last_purged_row.id)
        );

      PERFORM set_config('app.gdpr_audit_retention_purge', 'off', true);
    EXCEPTION
      WHEN OTHERS THEN
        PERFORM set_config('app.gdpr_audit_retention_purge', 'off', true);
        RAISE;
    END;

    company_id := company_row.company_id;
    deleted_rows := rows_to_delete;
    purged_through := last_purged_row.created_at;
    chain_start_hash := last_purged_row.entry_hash;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_gdpr_audit_logs(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_expired_gdpr_audit_logs(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_gdpr_audit_logs(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_gdpr_audit_logs(integer) TO service_role;

COMMENT ON FUNCTION public.purge_expired_gdpr_audit_logs(integer) IS
  'Service-role-only GDPR audit log retention cleanup that preserves the last purged hash for future chain verification.';

COMMIT;
