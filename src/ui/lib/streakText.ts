import { countLabel, NOUNS } from './plural'

/** «6 أيام متتالية» · «يوم واحد متتالي» · «11 يوم متتالي» — Arabic agreement, Western digits. */
export function streakTitle(n: number): string {
  if (n === 1) return 'يوم واحد متتالي'
  if (n === 2) return 'يومين متتاليين'
  if (n <= 10) return `${n} أيام متتالية`
  return `${n} يوم متتالي`
}

/** Chip text on the Habits list: «6 أيام» · «12 يوم». */
export const streakChipText = (n: number): string => countLabel(n, NOUNS.day)

/** Second line of the streak hero. Never a counter of failure. */
export function compensationLine(left: number): string {
  if (left <= 0) return 'ما باقي لك أيام تعويض هالأسبوع، وبكرة يوم جديد.'
  if (left === 1) return 'باقي لك يوم تعويض هالأسبوع'
  return 'باقي لك يومين تعويض هالأسبوع'
}
