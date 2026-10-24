import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CheckCircle } from '../../src/ui/components/CheckCircle'
import { ListRow } from '../../src/ui/components/ListRow'
import { Switch } from '../../src/ui/components/Switch'

describe('Switch', () => {
  it('is a role=switch that toggles and never bubbles to the row', () => {
    const onChange = vi.fn()
    const onRow = vi.fn()
    render(
      <div onClick={onRow}>
        <Switch checked={false} onChange={onChange} label="test" />
      </div>,
    )
    const sw = screen.getByRole('switch', { name: 'test' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(onRow).not.toHaveBeenCalled()
  })
})

describe('ListRow tap target', () => {
  it('has no button nested in a button when tappable with an interactive leading', () => {
    const onClick = vi.fn()
    const onCheck = vi.fn()
    const { container } = render(
      <ListRow title="test" onClick={onClick} leading={<CheckCircle checked={false} onChange={onCheck} label="خلّصت: test" />} />,
    )
    expect(container.querySelector('button button')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'test' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('checkbox', { name: 'خلّصت: test' }))
    expect(onCheck).toHaveBeenCalledWith(true)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
