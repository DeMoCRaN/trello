-- Enable audit triggers for all non-static business tables in public schema.
-- Excludes audit table itself and lookup/static dictionaries.
-- Safe to run multiple times.

DO $$
DECLARE
  rec RECORD;
  trigger_name TEXT;
BEGIN
  FOR rec IN
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename NOT IN ('audit_log', 'roles', 'task_statuses', 'task_priorities')
    ORDER BY t.tablename
  LOOP
    trigger_name := rec.tablename || '_audit_trigger';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger trg
      JOIN pg_class cls ON cls.oid = trg.tgrelid
      JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
      WHERE nsp.nspname = 'public'
        AND cls.relname = rec.tablename
        AND trg.tgname = trigger_name
        AND NOT trg.tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();',
        trigger_name,
        rec.tablename
      );
    END IF;
  END LOOP;
END
$$;
