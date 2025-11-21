import React, { useState, useMemo } from 'react';
import { DayOfWeek } from '../../types';

interface CalendarProps {
  value: string | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDays?: DayOfWeek[];
  dayNames?: string[];
}

const Calendar: React.FC<CalendarProps> = ({ value, onChange, minDate, maxDate, disabledDays = [], dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] }) => {
  const [viewDate, setViewDate] = useState(value ? new Date(value.replace(/-/g, '/')) : new Date());

  const selectedDate = useMemo(() => {
    return value ? new Date(value.replace(/-/g, '/')) : null;
  }, [value]);

  const changeMonth = (amount: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const daysOfWeek: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const disabledDayIndexes = disabledDays.map(day => daysOfWeek.indexOf(day));

  const { month, year, calendarGrid } = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const grid = [];
    let currentDate = new Date(firstDayOfMonth);
    currentDate.setDate(currentDate.getDate() - firstDayOfMonth.getDay());

    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        week.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      grid.push(week);
      if (currentDate > lastDayOfMonth && i >= 4) break;
    }
    return { month, year, calendarGrid: grid };
  }, [viewDate]);

  const isDateDisabled = (date: Date) => {
    date.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (minDate) {
        const min = new Date(minDate);
        min.setHours(0,0,0,0);
        if (date < min) return true;
    }

    if (maxDate) {
        const max = new Date(maxDate);
        max.setHours(0,0,0,0);
        if (date > max) return true;
    }

    if (disabledDayIndexes.includes(date.getDay())) {
        return true;
    }
    
    return false;
  };

  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-accent text-muted-foreground" aria-label="Previous month">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        </button>
        <div className="font-semibold text-foreground">
          {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewDate)}
        </div>
        <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-accent text-muted-foreground" aria-label="Next month">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
        {dayNames.map((day, index) => <div key={index}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.flat().map((date, i) => {
          const isCurrentMonth = date.getMonth() === month;
          const isDisabled = isDateDisabled(date);
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();
          const isLastBookableDay = maxDate && date.toDateString() === maxDate.toDateString() && !isDisabled && !isSelected;

          let buttonClasses = "w-full aspect-square rounded-full text-sm transition-colors ";
          if (isCurrentMonth) {
            if (isSelected) {
              buttonClasses += "bg-primary text-primary-foreground";
            } else if (isDisabled) {
              buttonClasses += "text-muted-foreground/50 cursor-not-allowed";
            } else {
              buttonClasses += "text-foreground hover:bg-accent";
            }
          } else {
            buttonClasses += "text-muted-foreground/30 cursor-not-allowed";
          }
          if (isToday && !isSelected) {
            buttonClasses += " border border-primary";
          }
          if (isLastBookableDay) {
            buttonClasses += " is-last-bookable-day";
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(date)}
              disabled={!isCurrentMonth || isDisabled}
              className={buttonClasses}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;