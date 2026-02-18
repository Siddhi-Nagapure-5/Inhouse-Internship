
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Datasets table
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  format TEXT DEFAULT 'csv',
  size_bytes BIGINT DEFAULT 0,
  quality_score FLOAT DEFAULT 0,
  version TEXT DEFAULT 'v1.0',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets" ON public.datasets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own datasets" ON public.datasets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own datasets" ON public.datasets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own datasets" ON public.datasets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Models table
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'classification',
  accuracy FLOAT DEFAULT 0,
  f1_score FLOAT DEFAULT 0,
  roc_auc FLOAT DEFAULT 0,
  status TEXT DEFAULT 'trained',
  train_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models" ON public.models FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own models" ON public.models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own models" ON public.models FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own models" ON public.models FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Experiments table
CREATE TABLE public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  accuracy FLOAT DEFAULT 0,
  f1_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'running',
  duration_seconds FLOAT,
  hyperparameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own experiments" ON public.experiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own experiments" ON public.experiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own experiments" ON public.experiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own experiments" ON public.experiments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for dataset files
INSERT INTO storage.buckets (id, name, public) VALUES ('datasets', 'datasets', false);

CREATE POLICY "Users can upload own dataset files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own dataset files" ON storage.objects FOR SELECT USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own dataset files" ON storage.objects FOR DELETE USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
