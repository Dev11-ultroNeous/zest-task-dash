-- Create app_role enum for the three roles
CREATE TYPE public.app_role AS ENUM ('manager', 'team_leader', 'developer');

-- Create user_roles table (roles stored separately for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add assigned_to column to tasks table for task assignment
ALTER TABLE public.tasks ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster queries on assigned tasks
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);

-- Security definer function to check user roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS policies for user_roles table
-- Users can view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Managers can view all roles (for team management)
CREATE POLICY "Managers can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'manager'));

-- Team leaders can view all roles
CREATE POLICY "Team leaders can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'team_leader'));

-- Only managers can assign roles
CREATE POLICY "Managers can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'manager'));

-- Update tasks RLS policies to support role-based access
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- New SELECT policy: 
-- Managers/Team Leaders see all tasks they created
-- Developers see only tasks assigned to them
CREATE POLICY "Role-based task viewing"
ON public.tasks FOR SELECT
USING (
  -- Task creator can always see their tasks
  auth.uid() = user_id
  -- Task assignee can see assigned tasks
  OR auth.uid() = assigned_to
  -- Managers can see all tasks
  OR public.has_role(auth.uid(), 'manager')
  -- Team leaders can see all tasks
  OR public.has_role(auth.uid(), 'team_leader')
);

-- INSERT policy: Managers and Team Leaders can create tasks
CREATE POLICY "Managers and team leaders can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'team_leader')
  )
);

-- UPDATE policy: Creators can update, assignees can update status
CREATE POLICY "Task update policy"
ON public.tasks FOR UPDATE
USING (
  auth.uid() = user_id
  OR auth.uid() = assigned_to
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'team_leader')
);

-- DELETE policy: Only creators, managers can delete
CREATE POLICY "Task delete policy"
ON public.tasks FOR DELETE
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'manager')
);

-- Create a profiles table to store user display names for assignment UI
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view profiles (needed for assignment dropdowns)
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Default new users to developer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'developer');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();