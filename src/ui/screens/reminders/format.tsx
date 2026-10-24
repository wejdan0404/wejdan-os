/** 12-hour clock text for reminders, as in the boards: «7:00 ص» · «4:30 م» (Western digits). */
export interface Clock12 {
  h: number
  mm: string
  period: 'ص' | 'م'
}
export function clock12(minute: number): Clock12 {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  return { h: h24 % 12 === 0 ? 12 : h24 % 12, mm: String(m % 60).padStart(2, '0'), period: h24 < 12 ? 'ص' : 'م' }
}
export const clock12Text = (minute: number): string => {
  const c = clock12(minute)
  return `${c.h}:${c.mm} ${c.period}`
}
/** From 12-hour parts back to a minute of day. */
export const fromClock12 = (h: number, mm: number, period: 'ص' | 'م'): number => ((h % 12) + (period === 'م' ? 12 : 0)) * 60 + mm

/** The time as a node: digits isolated LTR, the period word after it. */
export function Clock12Text({ minute }: { minute: number }) {
  const c = clock12(minute)
  return (
    <span>
      <bdi dir="ltr" className="num">
        {c.h}:{c.mm}
      </bdi>{' '}
      {c.period}
    </span>
  )
}
