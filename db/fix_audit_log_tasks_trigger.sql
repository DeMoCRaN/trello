-- Fix: ensure task changes are written to audit_log.
-- Safe to run multiple times.

DROP TRIGGER IF EXISTS tasks_audit_trigger ON public.tasks;

CREATE TRIGGER tasks_audit_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_function();
