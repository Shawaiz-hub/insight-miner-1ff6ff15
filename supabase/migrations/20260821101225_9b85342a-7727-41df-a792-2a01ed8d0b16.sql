CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text,
  full_name text NOT NULL,
  role text NOT NULL,
  short_bio text,
  description text,
  email text,
  phone text,
  location text,
  department text,
  experience text,
  education text,
  skills text[] NOT NULL DEFAULT '{}'::text[],
  linkedin_url text,
  github_url text,
  portfolio_url text,
  facebook_url text,
  instagram_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active team members"
ON public.team_members FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage team members"
ON public.team_members FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_team_members_order ON public.team_members (display_order);

DROP POLICY IF EXISTS "Public can read public site settings" ON public.site_settings;
CREATE POLICY "Public can read public site settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (setting_key = ANY (ARRAY['home_sections','sitemap_entries','seo_settings','backend_config','public_flags']));

CREATE POLICY "Team images are readable by everyone"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'team-images');

CREATE POLICY "Admins can upload team images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'team-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'team-images' AND public.has_role(auth.uid(), 'admin'));