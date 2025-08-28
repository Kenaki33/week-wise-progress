-- Create table for badge rewards
CREATE TABLE public.badge_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.badge_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies for badge rewards
CREATE POLICY "Users can view their own badge rewards" 
ON public.badge_rewards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badge rewards" 
ON public.badge_rewards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_badge_rewards_user_id ON public.badge_rewards(user_id);
CREATE INDEX idx_badge_rewards_badge_type ON public.badge_rewards(user_id, badge_type);