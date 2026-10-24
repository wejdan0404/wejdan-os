import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ExportJson, ImportPreview } from '../../src/domain'
import { ListRow } from '../../src/ui/components/ListRow'
import { Switch } from '../../src/ui/components/Switch'
import { countLabel, NOUNS } from '../../src/ui/lib/plural'
import { ImportReview } from '../../src/ui/screens/me/ImportReview'

describe('Switch', () => {
  it('on/off differ beyond colour: the check glyph shows only when on', () => {
    const { rerender } = render(<Switch checked={false} onChange={() => {}} label="test" />)
    const sw = screen.getByRole('switch', { name: 'test' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(sw.hasAttribute('data-on')).toBe(false)
    rerender(<Switch checked onChange={() => {}} label="test" />)
    expect(screen.getByRole('switch')).toHaveAttribute('data-on')
  })
})

describe('ListRow', () => {
  it('a row with a menu and no tap action shows a visible «خيارات» button that opens it', async () => {
    const onSelect = vi.fn()
    render(<ListRow title="test" menu={[{ key: 'a', label: 'أرشفي', onSelect }]} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'خيارات' })))
    await act(async () => fireEvent.click(await screen.findByRole('menuitem', { name: 'أرشفي' })))
    expect(onSelect).toHaveBeenCalled()
  })
})

describe('plural', () => {
  it('Arabic count agreement', () => {
    expect(countLabel(1, NOUNS.spark)).toBe('1 شرارة')
    expect(countLabel(2, NOUNS.spark)).toBe('شرارتين')
    expect(countLabel(5, NOUNS.spark)).toBe('5 شرارات')
    expect(countLabel(12, NOUNS.spark)).toBe('12 شرارة')
  })
})

describe('ImportReview', () => {
  const file: ExportJson = {
    schemaVersion: 1,
    exportedAt: '2026-10-01T10:00:00',
    boxes: {
      tasks: [{ id: 't1', title: 'test task' }, { id: 't2', title: 'test two' }],
      products: [{ id: 'p1', name: 'test product' }],
      dayPlans: [{ date: '2026-10-01' }],
      mockTests: [{ id: 'm1', date: '2026-09-01' }],
    },
    meta: { settings: { displayName: 'file' } },
  }
  const preview: ImportPreview = {
    ok: true, error: null, schemaVersion: 1, exportedAt: file.exportedAt,
    counts: { tasks: 2, products: 1, dayPlans: 1, mockTests: 1 },
    current: { tasks: 0, products: 3, inbox: 4 },
    skipped: 0,
  }
  const current: ExportJson = {
    schemaVersion: 1, exportedAt: 'x',
    boxes: { products: [{ id: 'mine', name: 'mine' }], inbox: [{ id: 'i1', title: 'mine' }] },
    meta: { settings: { displayName: 'device' } },
  }

  it('lists every box in Arabic (no raw keys), lets her keep a box and skip one item', async () => {
    let built: ExportJson | null = null
    render(
      <ImportReview fileName="test.json" data={file} preview={preview} busy={false} onCancel={() => {}} onConfirm={(b) => (built = b(current) as ExportJson)} />,
    )
    for (const ar of ['المهام', 'المنتجات', 'خطط الأيام', 'الاختبارات التجريبية', 'الوارد', 'الإعدادات']) expect(screen.getByText(ar)).toBeInTheDocument()
    expect(screen.queryByText('dayPlans')).not.toBeInTheDocument()
    // keep her products
    const prodGroup = screen.getByRole('radiogroup', { name: 'المنتجات: وش نسوي؟' })
    fireEvent.click(within(prodGroup).getByRole('radio', { name: 'خلّي اللي عندي' }))
    // skip one task
    const tasksBox = screen.getByText('المهام').closest('li')!
    fireEvent.click(within(tasksBox).getByRole('button', { name: /شوفي العناصر/ }))
    fireEvent.click(screen.getByRole('switch', { name: 'خذي «test two»' }))
    fireEvent.click(screen.getByRole('button', { name: 'اعتمدي اللي اخترتيه' }))
    expect(built).not.toBeNull()
    const out = built as unknown as ExportJson
    expect(out.boxes.products).toEqual(current.boxes.products)
    expect((out.boxes.tasks as { id: string }[]).map((t) => t.id)).toEqual(['t1'])
    // inbox: file has none → default keep hers
    expect(out.boxes.inbox).toEqual(current.boxes.inbox)
  })
})
