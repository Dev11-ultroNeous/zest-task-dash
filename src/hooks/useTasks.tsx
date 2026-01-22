import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Task, Category, Priority, TaskStatus } from '@/types/task';
import { useTaskStore } from '@/store/taskStore';
import { useToast } from './use-toast';

// Convert database row to Task type
function dbToTask(row: any, assigneeName?: string): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    priority: row.priority as Priority,
    status: row.status as TaskStatus,
    dueDate: row.due_date ? new Date(row.due_date) : null,
    category: row.category || 'Personal',
    tags: row.tags || [],
    estimatedMinutes: row.estimated_minutes,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    reminders: [], // Will be loaded separately if needed
    assignedTo: row.assigned_to || null,
    assignedToName: assigneeName,
  };
}

// Convert database row to Category type
function dbToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
  };
}

export function useTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    setTasks, 
    setCategories, 
    setLoading, 
    setInitialized,
    addTaskOptimistic,
    updateTaskOptimistic,
    deleteTaskOptimistic,
  } = useTaskStore();

  // Fetch all tasks for the current user (based on RLS policies)
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get tasks (RLS will filter based on role)
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for assignee names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email');

      const profileMap = new Map(
        (profiles || []).map(p => [p.id, p.display_name || p.email?.split('@')[0] || 'Unknown'])
      );

      const tasks = (tasksData || []).map(row => 
        dbToTask(row, row.assigned_to ? profileMap.get(row.assigned_to) : undefined)
      );
      setTasks(tasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error loading tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [user, setTasks, setLoading, setInitialized, toast]);

  // Fetch all categories for the current user
  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(data.map(dbToCategory));
      }
      // Keep default categories if none exist in DB
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  }, [user, setCategories]);

  // Add a new task (with optional assignment)
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'status' | 'reminders'> & { assignedTo?: string | null }) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to add tasks',
        variant: 'destructive',
      });
      return null;
    }

    // Create optimistic task
    const optimisticTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date(),
      completedAt: null,
      reminders: [],
    };

    // Add optimistically
    addTaskOptimistic(optimisticTask);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: taskData.title,
          description: taskData.description || '',
          priority: taskData.priority,
          status: 'pending',
          due_date: taskData.dueDate?.toISOString() || null,
          category: taskData.category,
          tags: taskData.tags || [],
          estimated_minutes: taskData.estimatedMinutes,
          assigned_to: taskData.assignedTo || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Get assignee name if assigned
      let assigneeName: string | undefined;
      if (data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', data.assigned_to)
          .single();
        assigneeName = profile?.display_name || profile?.email?.split('@')[0];
      }

      // Replace optimistic task with real one
      const realTask = dbToTask(data, assigneeName);
      updateTaskOptimistic(optimisticTask.id, realTask);
      
      return realTask;
    } catch (error: any) {
      // Rollback optimistic update
      deleteTaskOptimistic(optimisticTask.id);
      console.error('Error adding task:', error);
      toast({
        title: 'Error adding task',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, addTaskOptimistic, updateTaskOptimistic, deleteTaskOptimistic, toast]);

  // Update a task
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!user) return false;

    // Store original for rollback
    const originalTask = useTaskStore.getState().tasks.find(t => t.id === id);
    if (!originalTask) return false;

    // Optimistic update
    updateTaskOptimistic(id, updates);

    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate?.toISOString() || null;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_minutes = updates.estimatedMinutes;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt?.toISOString() || null;
      if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      // Rollback
      updateTaskOptimistic(id, originalTask);
      console.error('Error updating task:', error);
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, updateTaskOptimistic, toast]);

  // Delete a task
  const deleteTask = useCallback(async (id: string) => {
    if (!user) return false;

    // Store original for rollback
    const originalTask = useTaskStore.getState().tasks.find(t => t.id === id);
    
    // Optimistic delete
    deleteTaskOptimistic(id);

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      // Rollback
      if (originalTask) {
        addTaskOptimistic(originalTask);
      }
      console.error('Error deleting task:', error);
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, deleteTaskOptimistic, addTaskOptimistic, toast]);

  // Toggle task status
  const toggleTaskStatus = useCallback(async (id: string) => {
    const task = useTaskStore.getState().tasks.find(t => t.id === id);
    if (!task) return false;

    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    const completedAt = newStatus === 'completed' ? new Date() : null;

    return updateTask(id, { status: newStatus, completedAt });
  }, [updateTask]);

  // Add category
  const addCategory = useCallback(async (categoryData: Omit<Category, 'id'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: categoryData.name,
          color: categoryData.color,
          icon: categoryData.icon,
        })
        .select()
        .single();

      if (error) throw error;

      const newCategory = dbToCategory(data);
      setCategories([...useTaskStore.getState().categories, newCategory]);
      return newCategory;
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast({
        title: 'Error adding category',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, setCategories, toast]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchCategories();
    } else {
      setTasks([]);
      setInitialized(true);
    }
  }, [user, fetchTasks, fetchCategories, setTasks, setInitialized]);

  return {
    fetchTasks,
    fetchCategories,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    addCategory,
  };
}
