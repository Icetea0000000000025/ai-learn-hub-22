-- Week 3 Quiz System Migrations

-- 1. Quizzes Table (Linked to a lesson)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70,
    attempts_allowed INTEGER DEFAULT 0, -- 0 for unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice, multi_select, true_false
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Options Table
CREATE TABLE IF NOT EXISTS public.quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL
);

-- 4. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can read questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can read options" ON public.quiz_options FOR SELECT USING (true);
CREATE POLICY "Users can see own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
