-- REMS initial schema. Apply once to a NEW Supabase project.
-- All writes go through authorized FastAPI endpoints using server-only credentials.
-- React clients have read-only, RLS-restricted access to application tables.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;

-- One application profile per Supabase Auth account.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','manager','admin')),
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (manager_id IS NULL OR manager_id <> id)
);
CREATE INDEX profiles_manager_idx ON public.profiles(manager_id);

-- Restricted helper avoids recursive role lookups inside RLS policies.
CREATE FUNCTION private.app_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION private.app_role() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.app_role() TO authenticated;

-- Automatically create an employee profile when somebody signs up.
-- Never derive privileged role or manager assignment from user metadata.
CREATE FUNCTION private.create_profile_for_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.create_profile_for_new_user() FROM PUBLIC;
CREATE TRIGGER rems_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION private.create_profile_for_new_user();

-- Reimbursement rules.
CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('employee','manager','admin')),
  category text NOT NULL CHECK (length(btrim(category)) > 0),
  max_amount numeric(12,2) NOT NULL CHECK (max_amount >= 0),
  receipt_required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX policies_active_role_category_unique
  ON public.policies (role, lower(category)) WHERE active;

-- Expense requests.
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_manager_id uuid REFERENCES public.profiles(id),
  category text NOT NULL CHECK (length(btrim(category)) > 0),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency varchar(3) NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  expense_date date NOT NULL,
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (assigned_manager_id IS NULL OR employee_id <> assigned_manager_id)
);
CREATE INDEX expenses_employee_created_idx ON public.expenses(employee_id, created_at DESC);
CREATE INDEX expenses_manager_pending_idx ON public.expenses(assigned_manager_id,status,created_at DESC);

-- Receipt metadata; actual files are held in a PRIVATE Storage bucket.
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE CHECK (length(btrim(storage_path)) > 0),
  original_name text NOT NULL CHECK (length(btrim(original_name)) > 0),
  content_type text NOT NULL CHECK (content_type IN ('application/pdf','image/jpeg','image/png')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX receipts_expense_idx ON public.receipts(expense_id);

-- Review decisions; preserve historical entries.
CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id),
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decision <> 'rejected' OR length(btrim(COALESCE(reason,''))) > 0)
);
CREATE INDEX approvals_expense_idx ON public.approvals(expense_id, decided_at DESC);

-- Append-only audit log, written by authorized backend only.
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES public.expenses(id),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL CHECK (length(btrim(action)) > 0),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_expense_idx ON public.audit_logs(expense_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs(actor_id, created_at DESC);

-- Restrict operations and enable RLS on every exposed application table.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles,public.policies,public.expenses,
  public.receipts,public.approvals,public.audit_logs FROM anon,authenticated;
GRANT SELECT ON TABLE public.profiles,public.policies,public.expenses,
  public.receipts,public.approvals,public.audit_logs TO authenticated;

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT private.app_role()) = 'admin');

CREATE POLICY policies_select ON public.policies FOR SELECT TO authenticated
USING ((SELECT private.app_role()) = 'admin' OR
       (active AND role = (SELECT private.app_role())));

CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated
USING (employee_id = (SELECT auth.uid()) OR
       (assigned_manager_id = (SELECT auth.uid())
          AND (SELECT private.app_role()) IN ('manager','admin')) OR
       (SELECT private.app_role()) = 'admin');

CREATE POLICY receipts_select ON public.receipts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.expenses e WHERE e.id = expense_id
    AND (e.employee_id = (SELECT auth.uid()) OR
         (e.assigned_manager_id = (SELECT auth.uid())
           AND (SELECT private.app_role()) IN ('manager','admin')) OR
         (SELECT private.app_role()) = 'admin')
));

CREATE POLICY approvals_select ON public.approvals FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.expenses e WHERE e.id = expense_id
    AND (e.employee_id = (SELECT auth.uid()) OR
         (e.assigned_manager_id = (SELECT auth.uid())
           AND (SELECT private.app_role()) IN ('manager','admin')) OR
         (SELECT private.app_role()) = 'admin')
));

CREATE POLICY audit_logs_admin_select ON public.audit_logs FOR SELECT TO authenticated
USING ((SELECT private.app_role()) = 'admin');

-- Private receipt bucket, size limit 5 MiB, PDF/JPEG/PNG.
-- No browser storage.objects policies: uploads/downloads are backend-mediated.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('expense-receipts','expense-receipts',false,5242880,
        ARRAY['application/pdf','image/jpeg','image/png']::text[])
ON CONFLICT (id) DO NOTHING;
COMMIT;
