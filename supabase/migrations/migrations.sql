-- Week 1 & 2 LMS Migrations

-- 1. Modules Table
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Update Lessons Table for Modules and Content Types
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'video';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 3. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(course_id, user_id)
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    provider TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies (Basic examples)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read modules and reviews
CREATE POLICY "Anyone can read modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);

-- Allow authenticated users to create reviews
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to see their own payments
CREATE POLICY "Users can see own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- Creator/Admin access (simplified for brevity)
-- In production, add more specific policies for update/delete
