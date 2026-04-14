ALTER TABLE public.sermons
  ADD COLUMN IF NOT EXISTS sermon_type TEXT DEFAULT 'sermon' CHECK (sermon_type IN ('sermon', 'bible_study')),
  ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'expository',
  ADD COLUMN IF NOT EXISTS audience TEXT,
  ADD COLUMN IF NOT EXISTS duration TEXT,
  ADD COLUMN IF NOT EXISTS introduction TEXT,
  ADD COLUMN IF NOT EXISTS manuscript TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS speaker TEXT,
  ADD COLUMN IF NOT EXISTS draft_notes TEXT,
  ADD COLUMN IF NOT EXISTS additional_instructions TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();;
