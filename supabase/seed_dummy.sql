-- Create a dummy user in auth.users (This is tricky in SQL directly without admin API, 
-- so we will insert into profiles/contractors directly and assume we can map it if needed, 
-- or better: Just create a contractor that doesn't necessarily map to a logged-in user for the "finding" logic,
-- but our RLS might block it.

-- EASIER APPORACH: We will just insert into 'profiles' and 'contractors' with a known UUID.
-- We won't be able to "login" as this user easily without creating an Auth user, 
-- but we don't need to login as them, we just need them to "accept" the job.

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "recovery_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "created_at", "updated_at", "confirmation_token", "email_change", "email_change_token_new", "recovery_token") VALUES
('00000000-0000-0000-0000-000000000000', 'd0mmy-us3r-id00-0000-000000000000', 'authenticated', 'authenticated', 'dummy@handyman.com', 'encrypted_password', '2023-01-01 00:00:00+00', NULL, '2023-01-01 00:00:00+00', '{"provider": "email", "providers": ["email"]}', '{}', '2023-01-01 00:00:00+00', '2023-01-01 00:00:00+00', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, role, full_name, phone)
VALUES ('d0mmy-us3r-id00-0000-000000000000', 'contractor', 'Auto-Reply Handyman', '12345678')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contractors (id, company_name, org_nr, location, is_available)
VALUES (
    'd0mmy-us3r-id00-0000-000000000000', 
    'Rask Fiks AS (Dummy)', 
    '999999999', 
    ST_SetSRID(ST_MakePoint(10.7522, 59.9139), 4326), -- Oslo
    true
)
ON CONFLICT (id) DO NOTHING;
