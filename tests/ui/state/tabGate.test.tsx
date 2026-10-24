/** Store hooks: selector re-renders and hidden-tab freezing (perf, no behaviour change). */
import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { LifeStoreProvider, useLife, useLifeSelector } from '../../../src/ui/state/LifeStore'
import { TabGateContext, createTabGate, type MutableTabGate } from '../../../src/ui/state/tabGate'
import { makeStore } from '../today/harness'

function Probe({ id }: { id: string }) {
  const renders = useRef(0)
  renders.current++
  const energyCount = useLifeSelector((s) => s.energyChecks.length)
  return <p data-testid={id} data-renders={renders.current}>{energyCount}</p>
}

function WholeSnapshotProbe({ id }: { id: string }) {
  const renders = useRef(0)
  renders.current++
  const s = useLife()
  return <p data-testid={id} data-renders={renders.current}>{s.energyChecks.length}</p>
}

const rendersOf = (id: string) => Number(screen.getByTestId(id).getAttribute('data-renders'))

describe('useLifeSelector', () => {
  it('re-renders only when the selected slice changes', async () => {
    const store = await makeStore()
    render(
      <MemoryRouter>
        <LifeStoreProvider store={store}>
          <Probe id="sel" />
        </LifeStoreProvider>
      </MemoryRouter>,
    )
    const before = rendersOf('sel')
    // a write that doesn't touch energy checks
    await act(async () => {
      await store.quickAdd('test')
    })
    expect(rendersOf('sel')).toBe(before)
    await act(async () => {
      await store.setEnergy('yellow')
    })
    expect(rendersOf('sel')).toBe(before + 1)
    expect(screen.getByTestId('sel')).toHaveTextContent('1')
  })
})

describe('tab gate', () => {
  it('freezes a hidden tab and catches it up once when it becomes active', async () => {
    const store = await makeStore()
    let gate!: MutableTabGate
    function Host() {
      gate ??= createTabGate(false)
      return (
        <TabGateContext.Provider value={gate}>
          <WholeSnapshotProbe id="hidden" />
        </TabGateContext.Provider>
      )
    }
    render(
      <MemoryRouter>
        <LifeStoreProvider store={store}>
          <Host />
          <WholeSnapshotProbe id="live" />
        </LifeStoreProvider>
      </MemoryRouter>,
    )
    const hidden0 = rendersOf('hidden')
    const live0 = rendersOf('live')
    await act(async () => {
      await store.setEnergy('yellow')
      await store.quickAdd('test')
    })
    // the live screen followed both writes; the hidden tab didn't move
    expect(rendersOf('live')).toBeGreaterThan(live0)
    expect(rendersOf('hidden')).toBe(hidden0)
    expect(screen.getByTestId('hidden')).toHaveTextContent('0')
    // showing the tab catches it up in one render with the latest data
    act(() => gate.set(true))
    expect(rendersOf('hidden')).toBe(hidden0 + 1)
    expect(screen.getByTestId('hidden')).toHaveTextContent('1')
  })
})
