import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDatasets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["datasets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (dataset: {
      name: string;
      description?: string;
      format?: string;
      size_bytes?: number;
      quality_score?: number;
      file_url?: string;
    }) => {
      const { data, error } = await supabase
        .from("datasets")
        .insert({ ...dataset, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["datasets"] }),
  });
}

export function useExperiments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["experiments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiments")
        .select("*, datasets(name), models(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateExperiment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (experiment: {
      name: string;
      dataset_id?: string;
      model_id?: string;
      accuracy?: number;
      f1_score?: number;
      status?: string;
      duration_seconds?: number;
      hyperparameters?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("experiments")
        .insert({ ...experiment, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["experiments"] }),
  });
}

export function useModels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["models", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .order("accuracy", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (model: {
      name: string;
      type?: string;
      accuracy?: number;
      f1_score?: number;
      roc_auc?: number;
      status?: string;
      train_time?: string;
    }) => {
      const { data, error } = await supabase
        .from("models")
        .insert({ ...model, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (profile: { full_name?: string; email?: string }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(profile)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadDatasetFile() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("datasets")
        .upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from("datasets")
        .getPublicUrl(filePath);
      return { filePath, publicUrl };
    },
  });
}
