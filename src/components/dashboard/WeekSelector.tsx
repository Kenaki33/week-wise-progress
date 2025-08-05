import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isSameWeek, addWeeks, subWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useHabitData } from '@/hooks/useHabitData';

interface WeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  userId?: string;
}

export const WeekSelector = ({ selectedDate, onDateChange, userId }: WeekSelectorProps) => {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const { loadHabitData } = useHabitData(userId);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Preload habit data for visible weeks when calendar opens
  useEffect(() => {
    if (isOpen && userId) {
      let currentDate = calendarStart;
      const promises = [];
      
      while (currentDate <= calendarEnd) {
        promises.push(loadHabitData(currentDate));
        currentDate = addDays(currentDate, 7); // Skip by weeks
      }
      
      Promise.all(promises);
    }
  }, [isOpen, calendarStart, calendarEnd, userId, loadHabitData]);

  const handleDateClick = (date: Date) => {
    onDateChange(date);
    setIsOpen(false);
  };

  const goToPreviousWeek = () => {
    onDateChange(subWeeks(selectedDate, 1));
  };

  const goToNextWeek = () => {
    onDateChange(addWeeks(selectedDate, 1));
  };

  const renderCalendarDays = () => {
    const days = [];
    let currentDate = calendarStart;

    while (currentDate <= calendarEnd) {
      const date = currentDate;
      const isCurrentMonth = isSameMonth(date, calendarDate);
      const isSelected = isSameWeek(date, selectedDate, { weekStartsOn: 1 });
      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      
      days.push(
        <button
          key={date.toISOString()}
          onClick={() => handleDateClick(date)}
          className={`
            w-8 h-8 text-sm rounded-md transition-colors relative
            ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
            ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
            ${isToday ? 'border-2 border-black font-semibold' : ''}
            ${!isSelected && !isToday ? 'hover:bg-accent' : ''}
          `}
        >
          {format(date, 'd')}
        </button>
      );
      currentDate = addDays(currentDate, 1);
    }

    return days;
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPreviousWeek}
        className="flex-shrink-0 p-1.5 sm:p-2"
      >
        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="bg-card border-border hover:bg-muted flex-1 text-xs sm:text-base px-2 sm:px-4">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Wybierz tydzień: </span>
              {format(weekStart, 'dd.MM', { locale: pl })} - {format(weekEnd, 'dd.MM', { locale: pl })}
            </span>
          </Button>
        </DialogTrigger>
      
      <DialogContent className="max-w-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <h3 className="text-lg font-semibold">
              {format(calendarDate, 'LLLL yyyy', { locale: pl })}
            </h3>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {/* Calendar Headers */}
            <div className="grid grid-cols-7 gap-1">
              {['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB', 'ND'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <Button
      variant="outline"
      size="sm"
      onClick={goToNextWeek}
      className="flex-shrink-0 p-1.5 sm:p-2"
    >
      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
    </Button>
  </div>
  );
};