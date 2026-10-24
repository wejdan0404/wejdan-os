/** Accessibility regressions: stack focus (a11y #1), sheet modality (#2), crash safety (#8). */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../../../src/ui/components/ErrorBoundary'
import { Sheet } from '../../../src/ui/components/Sheet'
import { AppShell } from '../../../src/ui/shell/AppShell'
import { makeStore, renderWith } from '../today/harness'

async function onboardedStore() {
  const store = await makeStore()
  await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true })
  return store
}

describe('sheet modality (a11y #2)', () => {
  it('makes the page behind inert, has a named close button, and traps Tab', () => {
    const onClose = vi.fn()
    const { container, rerender } = render(
      <>
        <button type="button">خلف الورقة</button>
        <Sheet open onClose={onClose} title="test">
          <button type="button">أول</button>
          <button type="button">آخر</button>
        </Sheet>
      </>,
    )
    // the app container (a <body> child) is out of reach while the sheet is up
    expect(container).toHaveAttribute('inert')
    const close = screen.getByRole('button', { name: 'سكّري' })
    const last = screen.getByRole('button', { name: 'آخر' })
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <>
        <button type="button">خلف الورقة</button>
        <Sheet open={false} onClose={onClose} title="test">
          <button type="button">أول</button>
        </Sheet>
      </>,
    )
  })

  it('Escape closes only the top sheet', () => {
    const lower = vi.fn()
    const upper = vi.fn()
    render(
      <>
        <Sheet open onClose={lower} title="test">
          <p>تحت</p>
        </Sheet>
        <Sheet open onClose={upper} title="test 2">
          <p>فوق</p>
        </Sheet>
      </>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).not.toHaveBeenCalled()
  })

  it('leaves the toast region reachable', () => {
    const region = document.createElement('div')
    region.setAttribute('data-inert-exempt', '')
    document.body.appendChild(region)
    render(
      <Sheet open onClose={() => {}} title="test">
        <p>test</p>
      </Sheet>,
    )
    expect(region).not.toHaveAttribute('inert')
    region.remove()
  })
})

describe('ErrorBoundary (a11y #8)', () => {
  it('shows a calm recovery screen instead of a blank app, and retries', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let broken = true
    function Fragile() {
      if (broken) throw new Error('test')
      return <p>رجعت الشاشة</p>
    }
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: 'صار شي غلط — بياناتك بأمان' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حدّثي التطبيق' })).toBeInTheDocument()
    broken = false
    fireEvent.click(screen.getByRole('button', { name: 'جرّبي مرة ثانية' }))
    expect(screen.getByText('رجعت الشاشة')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('resets when the route (resetKey) changes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Bomb({ boom }: { boom: boolean }) {
      if (boom) throw new Error('test')
      return <p>تمام</p>
    }
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Bomb boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    rerender(
      <ErrorBoundary resetKey="/b">
        <Bomb boom={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('تمام')).toBeInTheDocument()
    spy.mockRestore()
  })
})

describe('navigation stack (a11y #1, #8)', () => {
  it('moves focus to the pushed screen title, hides the covered screen, and returns focus on back', { timeout: 20000 }, async () => {
    const store = await onboardedStore()
    renderWith(store, <AppShell />, '/me')
    // lazy tab roots can take over a second to load on a busy machine
    const settingsRow = await screen.findByRole('button', { name: 'الإعدادات' }, { timeout: 5000 })
    settingsRow.focus()
    fireEvent.click(settingsRow)

    const title = await screen.findByRole('heading', { level: 1, name: 'الإعدادات' }, { timeout: 5000 })
    await waitFor(() => expect(document.activeElement).toBe(title), { timeout: 3000 })
    // the covered Me screen is inert and hidden from assistive tech
    const base = document.querySelector('[data-active-root]')?.parentElement
    expect(base).toHaveAttribute('inert')
    expect(base).toHaveAttribute('aria-hidden', 'true')
    // exactly one main landmark: the pushed screen
    expect(document.querySelectorAll('[role="main"]')).toHaveLength(1)

    const pushed = document.querySelector<HTMLElement>('[data-stack="pushed"]')!
    fireEvent.click(within(pushed).getByRole('button', { name: /أنا/ }))
    await waitFor(() => expect(document.activeElement?.textContent).toContain('الإعدادات'), { timeout: 3000 })
    await waitFor(() => expect(document.querySelector('[data-stack="pushed"]')).toBeNull(), { timeout: 3000 })
    expect(base).not.toHaveAttribute('inert')
  })

  it('leaving the Routine Player for another pushed route never blanks the app', { timeout: 20000 }, async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = await onboardedStore()
    let go: (to: string) => void = () => {}
    function Nav() {
      go = useNavigate()
      return null
    }
    function Shell() {
      const [ready] = useState(true)
      return ready ? (
        <>
          <AppShell />
          <Nav />
        </>
      ) : null
    }
    renderWith(store, <Shell />, '/routine/am/play')
    await screen.findAllByText(/روتين الصبح|منتجاتك/, undefined, { timeout: 5000 })
    await act(async () => go('/me/products'))
    await screen.findByRole('heading', { level: 1, name: 'منتجاتي' }, { timeout: 5000 })
    expect(screen.queryByText('صار شي غلط — بياناتك بأمان')).toBeNull()
    expect(spy.mock.calls.some((c) => String(c[0]).includes('Screen crashed'))).toBe(false)
    spy.mockRestore()
  })
})
