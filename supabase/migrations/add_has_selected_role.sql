-- Add has_selected_role column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_selected_role BOOLEAN DEFAULT FALSE;
