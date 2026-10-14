'use client';

import {
  getNepaliDateParts,
  getNepaliMonthName,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { toNepaliDigits } from '@/utils/numbers';
import { useMemo } from 'react';

interface NepaliDateDisplayProps {
  className?: string;
}

const NEPALI_WEEKDAYS = [
  'आइतबार',               
  'सोमबार',                
  'मङ्गलबार',               
  'बुधबार',                   
  'बिहिबार',                 
  'शुक्रबार',              
  'शनिबार',                  
];

function getNepaliWeekday(date: Date): string {
  const dayOfWeek = date.getDay();                            
  return NEPALI_WEEKDAYS[dayOfWeek] ?? '';
}

export function NepaliDateDisplay({ className }: NepaliDateDisplayProps) {
  const todayLabel = useMemo(() => {
    const today = new Date();
    const { day, month, year } = getNepaliDateParts(today);
    const monthName = getNepaliMonthName(month);
    const weekday = getNepaliWeekday(today);

                                           
    const dayNepali = toNepaliDigits(day);
    const yearNepali = toNepaliDigits(year);

    return `आज: ${dayNepali} ${monthName} ${yearNepali} (${weekday})`;
  }, []);

  return (
    <p className={`text-xs font-medium uppercase tracking-wide text-primary ${className || ''}`}>
      {todayLabel}
    </p>
  );
}

