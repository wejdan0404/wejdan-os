import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { splitBidi } from '../../src/ui/components/Bidi'
import { Button } from '../../src/ui/components/Button'
import { CheckCircle } from '../../src/ui/components/CheckCircle'
import { EmptyState } from '../../src/ui/components/EmptyState'
import { ListRow } from '../../src/ui/components/ListRow'
import { PaydayCard } from '../../src/ui/components/PaydayCard'
import { ProgressArc } from '../../src/ui/components/ProgressArc'
import { SegmentedControl } from '../../src/ui/components/SegmentedControl'
import { StarDottedLine } from '../../src/ui/components/StarDottedLine'
import { TabBar } from '../../src/ui/components/TabBar'
import { ToastProvider, useToast } from '../../src/ui/components/Toast'

describe('CheckCircle', () => {
  it('is a labelled checkbox that toggles', () => {
    function Host() {
      const [c, setC] = useState(false)
      return <CheckCircle checked={c} onChange={setC} label="مشي" />
    }
    render(<Host />)
    const box = screen.getByRole('checkbox', { name: 'مشي' })
    expect(box).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
  })
})

describe('SegmentedControl', () => {
  it('selects by click and arrow keys follow RTL order', () => {
    const onChange = vi.fn()
    render(
      <div dir="rtl">
        <SegmentedControl
          label="وقت"
          segments={[
            { value: 'am', label: 'الصبح' },
            { value: 'pm', label: 'المسا' },
          ]}
          value="am"
          onChange={onChange}
        />
      </div>,
    )
    expect(screen.getByRole('radio', { name: 'الصبح' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'المسا' }))
    expect(onChange).toHaveBeenLastCalledWith('pm')
  })
})

describe('Bidi', () => {
  it('isolates Latin and number runs', () => {
    const parts = splitBidi('جدّدي من Absher أو my.gov.sa خلال 3 أيام')
    expect(parts.filter((p) => p.ltr).map((p) => p.text)).toEqual(['Absher', 'my.gov.sa', '3'])
  })
})

describe('ListRow', () => {
  it('exposes swipe actions to assistive tech', () => {
    const done = vi.fn()
    const later = vi.fn()
    render(
      <ListRow
        title="قراءة"
        leadingActions={[{ key: 'd', label: 'إنجاز', onAction: done }]}
        trailingActions={[{ key: 'l', label: 'بعدين', onAction: later }]}
      />,
    )
    // visually-hidden duplicates are always reachable
    const buttons = screen.getAllByRole('button', { name: 'بعدين' })
    fireEvent.click(buttons[buttons.length - 1])
    expect(later).toHaveBeenCalled()
  })
})

describe('Toast', () => {
  it('shows a message with an undo action', () => {
    const undo = vi.fn()
    function Trigger() {
      const toast = useToast()
      return <button onClick={() => toast({ message: 'انحذفت', actionLabel: 'تراجع', onAction: undo })}>احذفي</button>
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    act(() => {
      fireEvent.click(screen.getByText('احذفي'))
    })
    expect(screen.getByRole('status')).toHaveTextContent('انحذفت')
    fireEvent.click(screen.getByRole('button', { name: /تراجع/ }))
    expect(undo).toHaveBeenCalled()
  })
})

describe('misc', () => {
  it('ProgressArc and StarDottedLine carry accessible labels', () => {
    render(
      <>
        <ProgressArc value={0.5} label="نص الطريق" />
        <StarDottedLine total={4} done={2} label="خطوتين من أربع" />
      </>,
    )
    expect(screen.getByRole('img', { name: 'نص الطريق' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'خطوتين من أربع' })).toBeInTheDocument()
  })

  it('EmptyState, Button, PaydayCard render', () => {
    const onClick = vi.fn()
    render(
      <>
        <EmptyState title="يومك فاضي" />
        <Button onClick={onClick}>ابدئي</Button>
        <PaydayCard daysLeft={0} onPlan={() => {}} />
      </>,
    )
    expect(screen.getByText('يومك فاضي')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ابدئي' }))
    expect(onClick).toHaveBeenCalled()
    expect(screen.getByText('شهر جديد يبدأ اليوم')).toBeInTheDocument()
  })

  it('TabBar marks the active tab and reports selection', () => {
    const onSelect = vi.fn()
    render(<TabBar active="today" onSelect={onSelect} />)
    // navigation buttons with aria-current (a11y #13), not ARIA tabs
    expect(screen.getByRole('navigation', { name: 'الأقسام' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'اليوم' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'مساري' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByRole('tab')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'مساري' }))
    expect(onSelect).toHaveBeenCalledWith('path')
  })
})
