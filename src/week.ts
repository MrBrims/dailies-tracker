import { getISOWeekInfo, todayString } from "./parser";

export { getISOWeekInfo, todayString };

export function needsRotation(currentWeek: string | undefined, date: Date = new Date()): boolean {
  if (!currentWeek) {
    return true;
  }
  return currentWeek !== getISOWeekInfo(date).week;
}
