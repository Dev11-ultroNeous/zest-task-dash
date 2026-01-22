import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, Reminder } from '@/types/task';
import { useTaskStore } from '@/store/taskStore';
import { useToast } from '@/hooks/use-toast';

interface ActiveReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  reminderTime: Date;
  snoozeCount: number;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);
  const { tasks, updateTaskOptimistic } = useTaskStore();
  const { toast } = useToast();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const snoozeIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support desktop notifications.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: 'You will receive reminder alerts for your tasks.',
        });
        return true;
      } else {
        toast({
          title: 'Notifications blocked',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [toast]);

  // Show browser notification
  const showNotification = useCallback((title: string, body: string, taskId: string) => {
    if (permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: taskId,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }, [permission]);

  // Add active reminder for snooze/dismiss
  const triggerReminder = useCallback((task: Task, reminder: Reminder) => {
    const activeReminder: ActiveReminder = {
      id: reminder.id,
      taskId: task.id,
      taskTitle: task.title,
      reminderTime: new Date(reminder.time),
      snoozeCount: 0,
    };

    setActiveReminders(prev => {
      // Avoid duplicates
      if (prev.some(r => r.id === reminder.id)) return prev;
      return [...prev, activeReminder];
    });

    // Show desktop notification
    showNotification(
      '⏰ Task Reminder',
      `${task.title} - Reminder triggered!`,
      task.id
    );

    // Show toast notification
    toast({
      title: '⏰ Task Reminder',
      description: task.title,
      duration: 10000,
    });

    // Mark reminder as triggered (optimistic update only for local state)
    const updatedReminders = task.reminders.map(r =>
      r.id === reminder.id ? { ...r, triggered: true } : r
    );
    updateTaskOptimistic(task.id, { reminders: updatedReminders });
  }, [showNotification, toast, updateTaskOptimistic]);

  // Snooze a reminder (adds 5 minutes)
  const snoozeReminder = useCallback((reminderId: string) => {
    setActiveReminders(prev => {
      return prev.map(r => {
        if (r.id === reminderId) {
          const newSnoozeCount = r.snoozeCount + 1;
          
          // Clear existing snooze interval
          const existingInterval = snoozeIntervalsRef.current.get(reminderId);
          if (existingInterval) {
            clearTimeout(existingInterval);
          }

          // Set up next snooze alert (5 minutes)
          const snoozeTimeout = setTimeout(() => {
            showNotification(
              '⏰ Snoozed Reminder',
              `${r.taskTitle} - Reminder snoozed ${newSnoozeCount} time(s)`,
              r.taskId
            );
            toast({
              title: '⏰ Snoozed Reminder',
              description: `${r.taskTitle} - Snoozed ${newSnoozeCount} time(s)`,
              duration: 10000,
            });
          }, 5 * 60 * 1000); // 5 minutes

          snoozeIntervalsRef.current.set(reminderId, snoozeTimeout);

          toast({
            title: 'Reminder snoozed',
            description: 'You will be reminded again in 5 minutes.',
          });

          return { ...r, snoozeCount: newSnoozeCount };
        }
        return r;
      });
    });
  }, [showNotification, toast]);

  // Dismiss a reminder
  const dismissReminder = useCallback((reminderId: string) => {
    // Clear any snooze interval
    const existingInterval = snoozeIntervalsRef.current.get(reminderId);
    if (existingInterval) {
      clearTimeout(existingInterval);
      snoozeIntervalsRef.current.delete(reminderId);
    }

    setActiveReminders(prev => prev.filter(r => r.id !== reminderId));
    
    toast({
      title: 'Reminder dismissed',
      description: 'The reminder has been dismissed.',
    });
  }, [toast]);

  // Check for due reminders
  const checkReminders = useCallback(() => {
    const now = new Date();

    tasks.forEach(task => {
      if (task.status === 'completed') return;

      task.reminders.forEach(reminder => {
        if (reminder.triggered) return;

        const reminderTime = new Date(reminder.time);
        
        // Check if reminder is due (within the last minute to avoid missing)
        if (reminderTime <= now && reminderTime > new Date(now.getTime() - 60000)) {
          triggerReminder(task, reminder);
        }
      });
    });
  }, [tasks, triggerReminder]);

  // Set up check interval
  useEffect(() => {
    // Check permission on mount
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check reminders every 30 seconds
    checkIntervalRef.current = setInterval(checkReminders, 30000);
    
    // Initial check
    checkReminders();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      // Clear all snooze intervals
      snoozeIntervalsRef.current.forEach(interval => clearTimeout(interval));
      snoozeIntervalsRef.current.clear();
    };
  }, [checkReminders]);

  return {
    permission,
    requestPermission,
    activeReminders,
    snoozeReminder,
    dismissReminder,
    showNotification,
  };
}
