import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, X, AlarmClockOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActiveReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  reminderTime: Date;
  snoozeCount: number;
}

interface ReminderAlertProps {
  reminders: ActiveReminder[];
  onSnooze: (reminderId: string) => void;
  onDismiss: (reminderId: string) => void;
}

export function ReminderAlert({ reminders, onSnooze, onDismiss }: ReminderAlertProps) {
  if (reminders.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {reminders.map((reminder) => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-card border border-border rounded-xl shadow-2xl p-4 min-w-[320px]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-warning animate-pulse" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">
                      ⏰ Task Reminder
                    </h4>
                    <p className="text-sm text-foreground mt-0.5 line-clamp-2">
                      {reminder.taskTitle}
                    </p>
                  </div>
                  <button
                    onClick={() => onDismiss(reminder.id)}
                    className="p-1 rounded hover:bg-accent transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                {reminder.snoozeCount > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Snoozed {reminder.snoozeCount} time(s)</span>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSnooze(reminder.id)}
                    className="flex-1 gap-1.5"
                  >
                    <AlarmClockOff className="w-3.5 h-3.5" />
                    Snooze 5min
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onDismiss(reminder.id)}
                    className="flex-1"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
