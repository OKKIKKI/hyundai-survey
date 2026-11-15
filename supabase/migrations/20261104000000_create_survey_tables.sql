BEGIN;

CREATE TABLE public.responses (
  id text PRIMARY KEY,
  created_at text NOT NULL,
  answers text NOT NULL,
  prize integer NOT NULL,
  interview text NOT NULL,
  q11_applicable integer NOT NULL,
  receipt_hash text NOT NULL
);

CREATE INDEX responses_created ON public.responses (created_at);

CREATE TABLE public.contacts (
  response_id text PRIMARY KEY REFERENCES public.responses (id),
  phone text NOT NULL,
  consent_at text NOT NULL,
  consent_version text NOT NULL,
  notice text NOT NULL,
  expires_at text NOT NULL,
  shipment_completed_at text
);

CREATE TABLE public.audit (
  id text PRIMARY KEY,
  at text NOT NULL,
  actor text NOT NULL,
  action text NOT NULL,
  target text
);

CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at bigint NOT NULL
);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.responses, public.contacts, public.audit, public.rate_limits
FROM anon, authenticated;

COMMIT;
