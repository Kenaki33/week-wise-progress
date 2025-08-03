import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isSameWeek } from 'date-fns';
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
  const { loadHabitData, getWeekProgressColor } = useHabitData(userId);

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
            w-8 h-8 text-sm rounded-md transition-colors
            ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
            ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
            ${isToday && !isSelected ? 'bg-warning text-warning-foreground font-semibold' : ''}
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

  const renderCalendarWithDots = () => {
    const rows = [];
    let currentDate = calendarStart;
    
    // Calculate how many weeks we have
    const totalDays = Math.ceil((calendarEnd.getTime() - calendarStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);
    
    for (let week = 0; week < totalWeeks; week++) {
      const weekDays = [];
      const weekStartDate = addDays(calendarStart, week * 7);
      
      // Render 7 days for this week
      for (let day = 0; day < 7 && currentDate <= calendarEnd; day++) {
        const date = currentDate;
        const isCurrentMonth = isSameMonth(date, calendarDate);
        const isSelected = isSameWeek(date, selectedDate, { weekStartsOn: 1 });
        const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        
        weekDays.push(
          <button
            key={date.toISOString()}
            onClick={() => handleDateClick(date)}
            className={`
              w-8 h-8 text-sm rounded-md transition-colors
              ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
              ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
              ${isToday && !isSelected ? 'bg-warning text-warning-foreground font-semibold' : ''}
              ${!isSelected && !isToday ? 'hover:bg-accent' : ''}
            `}
          >
            {format(date, 'd')}
          </button>
        );
        currentDate = addDays(currentDate, 1);
      }
      
      // Get progress color for this week
      const progressColor = getWeekProgressColor(weekStartDate);
      
      rows.push(
        <div key={week} className="flex items-center gap-3">
          <div className="grid grid-cols-7 gap-1 flex-1">
            {weekDays}
          </div>
          <div 
            className={`w-4 h-4 rounded-full ${progressColor}`}
            title={`Tydzień ${format(weekStartDate, 'dd.MM')} - ${format(addDays(weekStartDate, 6), 'dd.MM')}`}
          />
        </div>
      );
    }
    
    return rows;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-card border-border hover:bg-muted w-full sm:w-auto text-sm sm:text-base">
          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            Wybierz tydzień: {format(weekStart, 'dd.MM', { locale: pl })} - {format(weekEnd, 'dd.MM', { locale: pl })}
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
            <div className="flex gap-3">
              <div className="grid grid-cols-7 gap-1 flex-1">
                {['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB', 'ND'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="w-4" /> {/* Spacer for dots column */}
            </div>
            
            {/* Calendar Rows with Progress Dots */}
            <div className="space-y-1">
              {renderCalendarWithDots()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};