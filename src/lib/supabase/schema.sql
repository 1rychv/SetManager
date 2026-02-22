-- GigSync Database Schema
-- Designed for Supabase (PostgreSQL)
-- Based on prototype store.tsx data models

-- =================== ENUMS ===================

CREATE TYPE user_role AS ENUM ('organiser', 'member');
CREATE TYPE rsvp_status AS ENUM ('confirmed', 'declined', 'pending', 'maybe');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE file_type AS ENUM ('document', 'image', 'audio');

-- =================== TABLES ===================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  open_mic_enabled BOOLEAN NOT NULL DEFAULT false,
  slug TEXT NOT NULL UNIQUE,
  setlist_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event Members (normalized join table for team/RSVP)
CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_role TEXT,
  rsvp rsvp_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Setlists
CREATE TABLE setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key from events to setlists (circular reference, added after both tables exist)
ALTER TABLE events
  ADD CONSTRAINT fk_events_setlist
  FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE SET NULL;

-- Songs
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL DEFAULT '',
  bpm INTEGER NOT NULL DEFAULT 0,
  arrangement_notes TEXT NOT NULL DEFAULT '',
  is_open_mic BOOLEAN NOT NULL DEFAULT false,
  open_mic_application_id UUID,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Song Role Assignments
CREATE TABLE song_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  person_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  is_open_mic_performer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type file_type NOT NULL,
  size TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Open Mic Applications
CREATE TABLE open_mic_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  song TEXT NOT NULL,
  instrument_needs TEXT NOT NULL DEFAULT '',
  status application_status NOT NULL DEFAULT 'pending',
  organiser_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key from songs to open_mic_applications
ALTER TABLE songs
  ADD CONSTRAINT fk_songs_open_mic_application
  FOREIGN KEY (open_mic_application_id) REFERENCES open_mic_applications(id) ON DELETE SET NULL;

-- =================== INDEXES ===================

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_event_members_event ON event_members(event_id);
CREATE INDEX idx_event_members_user ON event_members(user_id);
CREATE INDEX idx_setlists_event ON setlists(event_id);
CREATE INDEX idx_songs_setlist ON songs(setlist_id);
CREATE INDEX idx_songs_position ON songs(setlist_id, position);
CREATE INDEX idx_song_role_assignments_song ON song_role_assignments(song_id);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX idx_files_event ON files(event_id);
CREATE INDEX idx_files_uploader ON files(uploader_id);
CREATE INDEX idx_open_mic_applications_event ON open_mic_applications(event_id);
CREATE INDEX idx_open_mic_applications_status ON open_mic_applications(status);

-- =================== TRIGGERS ===================

-- Auto-create profile on new auth.users signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_members_updated_at
  BEFORE UPDATE ON event_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON setlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_open_mic_applications_updated_at
  BEFORE UPDATE ON open_mic_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================== ROW LEVEL SECURITY ===================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_mic_applications ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can read all profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Events: authenticated users can read, organisers can write
CREATE POLICY "Events are viewable by authenticated users"
  ON events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organisers can create events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can update events"
  ON events FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can delete events"
  ON events FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

-- Event Members: authenticated can read, organisers manage, members update own RSVP
CREATE POLICY "Event members are viewable by authenticated users"
  ON event_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organisers can manage event members"
  ON event_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can update event members"
  ON event_members FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
    OR user_id = auth.uid()
  );

CREATE POLICY "Organisers can remove event members"
  ON event_members FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

-- Setlists: authenticated can read, organisers can write
CREATE POLICY "Setlists are viewable by authenticated users"
  ON setlists FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organisers can create setlists"
  ON setlists FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can update setlists"
  ON setlists FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can delete setlists"
  ON setlists FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

-- Songs: authenticated can read, organisers can write
CREATE POLICY "Songs are viewable by authenticated users"
  ON songs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organisers can create songs"
  ON songs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can update songs"
  ON songs FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can delete songs"
  ON songs FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

-- Song Role Assignments: same as songs
CREATE POLICY "Song roles are viewable by authenticated users"
  ON song_role_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organisers can create song roles"
  ON song_role_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can delete song roles"
  ON song_role_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

-- Announcements: authenticated can read, organisers can write
CREATE POLICY "Announcements are viewable by authenticated users"
  ON announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organisers can create announcements"
  ON announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can update announcements"
  ON announcements FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

CREATE POLICY "Organisers can delete announcements"
  ON announcements FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

-- Files: authenticated can read and upload, organisers can delete
CREATE POLICY "Files are viewable by authenticated users"
  ON files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload files"
  ON files FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid());

CREATE POLICY "Organisers can delete files"
  ON files FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
    OR uploader_id = auth.uid()
  );

-- Open Mic Applications: public can insert, authenticated can read, organisers can update
CREATE POLICY "Anyone can submit applications"
  ON open_mic_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all applications"
  ON open_mic_applications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public can view approved applications"
  ON open_mic_applications FOR SELECT TO anon
  USING (status = 'approved');

CREATE POLICY "Organisers can update applications"
  ON open_mic_applications FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
  );

-- =================== STORAGE ===================

-- Create a storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "Authenticated users can view files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'files');

CREATE POLICY "File owners and organisers can delete files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organiser')
    )
  );
