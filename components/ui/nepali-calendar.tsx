'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toNepaliDigits } from '@/utils/numbers';
import { cn } from '@/utils/cn';
import {
  BIKRAM_SAMBAT_MAX_SUPPORTED_YEAR,
  BIKRAM_SAMBAT_MIN_SUPPORTED_YEAR,
  bikramSambatToGregorian,
  getDaysInBikramSambatMonth,
  gregorianToBikramSambat,
  type BikramSambatDate,
} from '@/utils/nepali-calender-dates/nepali-date';

type CalendarCell = BikramSambatDate & {
  date: Date;
  isCurrentMonth: boolean;
};

const nepaliMonths = [
  'बैशाख',
  'जेष्ठ',
  'आषाढ',
  'श्रावण',
  'भाद्र',
  'आश्विन',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुन',
  'चैत्र',
] as const;

const nepaliDaysAbbr = ['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श'] as const;
function isSaturday(date: Date) {
  return date.getDay() === 6;
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampMonth(month: number) {
  return Math.min(12, Math.max(1, month));
}

function buildYearOptions(params: {
  currentYear: number;
  fromDate?: Date;
  toDate?: Date;
}) {
  const fromYear = params.fromDate ? gregorianToBikramSambat(params.fromDate).year : undefined;
  const toYear = params.toDate ? gregorianToBikramSambat(params.toDate).year : undefined;
  const startYear = Math.max(
    BIKRAM_SAMBAT_MIN_SUPPORTED_YEAR,
    fromYear ?? BIKRAM_SAMBAT_MIN_SUPPORTED_YEAR,
  );
  const endYear = Math.min(
    BIKRAM_SAMBAT_MAX_SUPPORTED_YEAR,
    toYear ?? BIKRAM_SAMBAT_MAX_SUPPORTED_YEAR,
  );
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }
  return years;
}

function getFirstDayOfBSMonth(bsYear: number, bsMonth: number): Date {
  return bikramSambatToGregorian({ year: bsYear, month: bsMonth, day: 1 });
}

function buildCalendar(year: number, month: number): CalendarCell[][] {
  const firstDay = getFirstDayOfBSMonth(year, month);
  const startWeekday = firstDay.getDay();                     
  const daysInMonth = getDaysInBikramSambatMonth(year, month);

  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: CalendarCell[] = [];
  const previousMonthDays = getDaysInBikramSambatMonth(previousYear, previousMonth);

  for (let offset = startWeekday - 1; offset >= 0; offset -= 1) {
    const day = previousMonthDays - offset;
    cells.push({
      year: previousYear,
      month: previousMonth,
      day,
      date: bikramSambatToGregorian({ year: previousYear, month: previousMonth, day }),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      year,
      month,
      day,
      date: bikramSambatToGregorian({ year, month, day }),
      isCurrentMonth: true,
    });
  }

  let forwardDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      year: nextYear,
      month: nextMonth,
      day: forwardDay,
      date: bikramSambatToGregorian({ year: nextYear, month: nextMonth, day: forwardDay }),
      isCurrentMonth: false,
    });
    forwardDay += 1;
  }

  while (cells.length < 42) {
    cells.push({
      year: nextYear,
      month: nextMonth,
      day: forwardDay,
      date: bikramSambatToGregorian({ year: nextYear, month: nextMonth, day: forwardDay }),
      isCurrentMonth: false,
    });
    forwardDay += 1;
  }

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export interface NepaliCalendarProps {
  selected?: Date;
  defaultMonth?: Date;
  onSelect?: (date: Date | undefined) => void;
  fromDate?: Date;
  toDate?: Date;
  disabled?: (date: Date) => boolean;
  showOutsideDays?: boolean;
  className?: string;
  initialFocus?: boolean;
  mode?: 'single';
}

export function NepaliCalendar({
  selected,
  defaultMonth,
  onSelect,
  fromDate,
  toDate,
  disabled,
  showOutsideDays = true,
  className,
}: NepaliCalendarProps) {
  const initialMonth = React.useMemo(
    () => gregorianToBikramSambat(selected ?? defaultMonth ?? new Date()),
    [defaultMonth, selected],
  );
  const monthAnchor = selected?.getTime() ?? defaultMonth?.getTime() ?? null;
  const [monthState, setMonthState] = React.useState(() => ({
    anchor: monthAnchor,
    year: initialMonth.year,
    month: initialMonth.month,
  }));
  const currentMonth = monthState.anchor === monthAnchor
    ? monthState
    : { anchor: monthAnchor, year: initialMonth.year, month: initialMonth.month };
  const setCurrentMonth = (update: (month: typeof currentMonth) => typeof currentMonth) => {
    setMonthState((previous) => {
      const activeMonth = previous.anchor === monthAnchor ? previous : currentMonth;
      return update(activeMonth);
    });
  };

  const weeks = React.useMemo(
    () => buildCalendar(currentMonth.year, currentMonth.month),
    [currentMonth.month, currentMonth.year],
  );
  const today = React.useMemo(() => gregorianToBikramSambat(new Date()), []);
  const normalizedFromDate = React.useMemo(
    () => (fromDate ? normalizeDate(fromDate) : undefined),
    [fromDate],
  );
  const normalizedToDate = React.useMemo(() => (toDate ? normalizeDate(toDate) : undefined), [toDate]);
  const yearOptions = React.useMemo(
    () => buildYearOptions({ currentYear: initialMonth.year, fromDate, toDate }),
    [fromDate, initialMonth.year, toDate],
  );

  const moveMonth = (direction: -1 | 1) => {
    setCurrentMonth((prev) => {
      const nextMonth = prev.month + direction;
      if (nextMonth < 1) {
        if (prev.year <= BIKRAM_SAMBAT_MIN_SUPPORTED_YEAR) return prev;
        return { ...prev, year: prev.year - 1, month: 12 };
      }
      if (nextMonth > 12) {
        if (prev.year >= BIKRAM_SAMBAT_MAX_SUPPORTED_YEAR) return prev;
        return { ...prev, year: prev.year + 1, month: 1 };
      }
      return { ...prev, year: prev.year, month: nextMonth };
    });
  };

  const canSelectDate = (date: Date) => {
    if (disabled?.(date)) return false;
    const normalized = normalizeDate(date);
    if (normalizedFromDate && normalized < normalizedFromDate) return false;
    if (normalizedToDate && normalized > normalizedToDate) return false;
    return true;
  };

  const handleSelect = (cell: CalendarCell) => {
    if (!canSelectDate(cell.date)) return;
    onSelect?.(cell.date);
  };

  return (
    <div className={cn('space-y-3 p-2.5', className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => moveMonth(-1)}
          aria-label="Previous month"
          className="shrink-0"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
          <Select
            value={String(currentMonth.month)}
            onValueChange={(value) =>
              setCurrentMonth((prev) => ({ ...prev, month: clampMonth(Number.parseInt(value, 10)) }))
            }
          >
            <SelectTrigger className="h-9 min-w-0 rounded-md text-left">
              <SelectValue aria-label="Month">
                {nepaliMonths[currentMonth.month - 1] ?? ''}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper">
              {nepaliMonths.map((monthName, index) => (
                <SelectItem key={monthName} value={String(index + 1)}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(currentMonth.year)}
            onValueChange={(value) =>
              setCurrentMonth((prev) => ({ ...prev, year: Number.parseInt(value, 10) || prev.year }))
            }
          >
            <SelectTrigger className="h-9 rounded-md">
              <SelectValue aria-label="Year">
                {toNepaliDigits(currentMonth.year)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {toNepaliDigits(year)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => moveMonth(1)}
          aria-label="Next month"
          className="shrink-0"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 pb-1 text-xs text-muted-foreground">
        {nepaliDaysAbbr.map((day, index) => (
          <div
            key={day}
            className={cn('text-center', index === 6 && 'text-destructive font-semibold')}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-rows-6 gap-1">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 gap-1">
            {week.map((cell) => {
              const isSelected = selected ? isSameDay(cell.date, selected) : false;
              const isToday = cell.year === today.year && cell.month === today.month && cell.day === today.day;
              const isDisabled = !canSelectDate(cell.date);
              const shouldShow = showOutsideDays || cell.isCurrentMonth;
              const saturday = isSaturday(cell.date);

              if (!shouldShow) {
                return <div key={`${cell.year}-${cell.month}-${cell.day}`} className="h-8" />;
              }

              return (
                <button
                  key={`${cell.year}-${cell.month}-${cell.day}`}
                  type="button"
                  onClick={() => handleSelect(cell)}
                  disabled={isDisabled}
                  className={cn(
                    'h-8 rounded-md text-sm flex items-center justify-center',
                    cell.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                    saturday && cell.isCurrentMonth && !isSelected && 'text-destructive',
                    saturday && !cell.isCurrentMonth && !isSelected && 'text-destructive/60',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && isToday && 'border border-primary/50',
                    isDisabled && 'opacity-40 cursor-not-allowed',
                    !isDisabled && !isSelected && (saturday ? 'hover:bg-destructive/10' : 'hover:bg-muted'),
                  )}
                >
                  {toNepaliDigits(cell.day)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
