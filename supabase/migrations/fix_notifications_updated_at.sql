-- Add updated_at column to system_notifications
ALTER TABLE public.system_notifications ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
