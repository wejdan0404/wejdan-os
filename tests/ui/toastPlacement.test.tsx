/** N1 — the undo toast floats above whatever is docked to the screen; it never covers or disables a control. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, useToast } from '../../src/ui/components/Toast'

function Fire() {
  const toast = useToast()
  useEffect(() => toast({ message: 'test انحفظت', actionLabel: 'تراجع', onAction: () => {} }), [toast])
  return null
}

/** jsdom has no layout: give a docked element the box a real phone would. */
const box = (el: HTMLElement, top: number, height: number, left = 0, width = 390) => {
  el.getBoundingClientRect = () =>
    ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect
}

beforeEach(() => {
  // a phone: 390 wide (jsdom is 1024 x 768)
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
})

afterEach(() => {
  document.documentElement.style.removeProperty('--toast-reserve')
  document.body.removeAttribute('data-toast-reserve')
})

async function showToast(ui: React.ReactNode) {
  const view = render(
    <ToastProvider>
      {ui}
      <Fire />
    </ToastProvider>,
  )
  const msg = await screen.findByText('test انحفظت')
  return { ...view, region: msg.closest('[role="status"]') as HTMLElement }
}

describe('N1 — toast placement', () => {
  it('with nothing docked it sits at the bottom edge and reserves its own band', async () => {
    const { region } = await showToast(<main />)
    expect(region.getAttribute('data-placement')).toBe('dock')
    expect(region.style.getPropertyValue('--toast-bottom')).toBe('')
    expect(document.body.hasAttribute('data-toast-reserve')).toBe(true)
    expect(parseInt(document.documentElement.style.getPropertyValue('--toast-reserve'))).toBeGreaterThan(0)
  })

  it('lifts above a fixed tab bar and leaves every tab live (not inert, not hidden)', async () => {
    const { region } = await showToast(
      <nav aria-label="الأقسام" style={{ position: 'fixed', insetBlockEnd: 0 }} ref={(el) => el && box(el, 712, 56)}>
        <ul>
          <li>
            <button type="button" ref={(el) => el && box(el, 712, 56, 20, 60)}>أنا</button>
          </li>
        </ul>
      </nav>,
    )
    // innerHeight 768: tab bar top 712 -> toast bottom edge 56 + 8 px above the viewport bottom
    expect(region.style.getPropertyValue('--toast-bottom')).toBe('64px')
    expect(document.querySelector('nav ul')!.hasAttribute('inert')).toBe(false)
    expect(document.querySelector('nav')!.hasAttribute('inert')).toBe(false)
    expect(document.body.hasAttribute('data-toast-docked')).toBe(false)
    // the toast's band is handed to the shell: it ends where the toast starts
    expect(parseInt(document.documentElement.style.getPropertyValue('--toast-reserve'))).toBeGreaterThanOrEqual(64 + 48)
  })

  it('lifts above a fixed + button stacked over the tab bar', async () => {
    const { region } = await showToast(
      <>
        <nav aria-label="الأقسام" style={{ position: 'fixed' }} ref={(el) => el && box(el, 712, 56)}>
          <button type="button" ref={(el) => el && box(el, 712, 56, 20, 60)}>أنا</button>
        </nav>
        <button type="button" aria-label="إضافة سريعة" style={{ position: 'fixed' }} ref={(el) => el && box(el, 640, 56, 20, 56)} />
      </>,
    )
    expect(region.style.getPropertyValue('--toast-bottom')).toBe('136px') // 768 - 640 + 8
  })

  it('a sticky footer is not docked to the screen: the screens ride above the toast instead', async () => {
    const { region } = await showToast(
      <footer style={{ position: 'sticky' }} ref={(el) => el && box(el, 640, 128)}>
        <button type="button" ref={(el) => el && box(el, 660, 52, 20, 350)}>أرتّبه بنفسي</button>
      </footer>,
    )
    expect(region.style.getPropertyValue('--toast-bottom')).toBe('')
  })

  it('keeps aria-live polite, a 44pt «تراجع», and releases the band when it goes', async () => {
    const { region } = await showToast(<main />)
    expect(region.getAttribute('aria-live')).toBe('polite')
    const undo = screen.getByRole('button', { name: /تراجع/ })
    expect(undo).toBeInTheDocument()
    // 44pt target (CSS modules are not applied in jsdom, so read the rule)
    const css = readFileSync(resolve(process.cwd(), 'src/ui/components/Toast.module.css'), 'utf8')
    expect(css).toMatch(/\.action\s*\{[^}]*min-height:\s*var\(--tap\)/)
    await act(async () => {
      fireEvent.click(screen.getByText('test انحفظت'))
    })
    await waitFor(() => expect(screen.queryByText('test انحفظت')).not.toBeInTheDocument())
    expect(document.body.hasAttribute('data-toast-reserve')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--toast-reserve')).toBe('')
  })
})
