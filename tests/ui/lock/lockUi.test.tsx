import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Vault, type KeyValue, type PreparedProfile, type Profile } from '../../../src/domain/vault'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { VaultContext, type VaultApi } from '../../../src/ui/lock/context'
import { LockSetup } from '../../../src/ui/lock/LockSetup'
import { ProfilePicker } from '../../../src/ui/lock/ProfilePicker'
import { ProfileDeleteSheet, AutoLockSheet } from '../../../src/ui/lock/ProfileSheets'
import { UnlockScreen } from '../../../src/ui/lock/UnlockScreen'

/** Minimal stand-in for user-event (not installed): controlled inputs via change events, clicks via click. */
const userEvent = {
  setup: () => ({
    type: async (el: HTMLElement, text: string) => void fireEvent.change(el, { target: { value: (el as HTMLInputElement).value + text } }),
    clear: async (el: HTMLElement) => void fireEvent.change(el, { target: { value: '' } }),
    click: async (el: HTMLElement) => void fireEvent.click(el),
  }),
}
/** Text that <Bidi> splits into <bdi> runs: match the innermost element whose whole text equals / matches. */
const txt = (t: string | RegExp) =>
  screen.getByText((_, el) => {
    const own = el?.textContent?.trim() ?? ''
    const hit = (x: string) => (typeof t === 'string' ? x === t : t.test(x))
    return !!el && hit(own) && ![...el.children].some((c) => hit(c.textContent?.trim() ?? ''))
  })
const mkKv = (): KeyValue => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}
let n = 0
const apiFor = (vault: Vault, extra: Partial<VaultApi> = {}): VaultApi => ({
  vault, enabled: vault.enabled, profiles: vault.profiles, current: null, autoLock: vault.autoLock,
  activate: vi.fn(async () => {}), addAndEnter: vi.fn(async () => {}), lock: vi.fn(), turnOff: vi.fn(async () => {}),
  removeProfile: vi.fn(async () => {}), adopt: vi.fn(), setAutoLock: vi.fn(), ...extra,
})
const wrap = (api: VaultApi, ui: ReactNode) => (
  <VaultContext.Provider value={api}>
    <ToastProvider>{ui}</ToastProvider>
  </VaultContext.Provider>
)
/** A vault with one profile (username test, password `test password 1`) over an empty plain DB. */
async function vaultWithProfile(username = 'test') {
  const vault = new Vault(mkKv(), 1000)
  const prep = await vault.prepare({ name: 'test', username, password: 'test password 1' })
  const { session } = await vault.enableWithExisting(prep, `lockui_plain_${n++}`)
  await session.repo.close()
  return { vault, prep, profile: vault.profiles[0] as Profile }
}

describe('LockSetup (two steps)', () => {
  it('«كمّلي» stays disabled until username ≥3, password ≥8 and the repeat match; strength is live; nothing is saved before «حفظته»', async () => {
    const vault = new Vault(mkKv(), 1000)
    const api = apiFor(vault)
    const user = userEvent.setup()
    render(wrap(api, <LockSetup name="test" onClose={() => {}} />))
    const next = screen.getByRole('button', { name: 'كمّلي' })
    expect(next).toBeDisabled()
    expect(screen.getByText('قفل بسيط يحمي بياناتك على هالجهاز. ما يطلع منه شي لأي سيرفر.')).toBeInTheDocument()
    expect(screen.getByText('ما فيه استرجاع لو نسيتي كلمة السر')).toBeInTheDocument()
    await user.type(screen.getByLabelText('اسم المستخدم'), 'te')
    await user.type(screen.getByLabelText('كلمة السر', { exact: true }), 'short')
    expect(screen.getByRole('img', { name: 'قوة كلمة السر: 1 من 4' })).toBeInTheDocument()
    expect(screen.getByText('لسا قصيرة، زيدي كم حرف')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('كلمة السر', { exact: true }))
    await user.type(screen.getByLabelText('كلمة السر', { exact: true }), 'test password 1')
    expect(screen.getByRole('img', { name: /قوة كلمة السر: [34] من 4/ })).toBeInTheDocument()
    await user.type(screen.getByLabelText('أعيدي كلمة السر'), 'test password X')
    fireEvent.blur(screen.getByLabelText('أعيدي كلمة السر'))
    expect(txt('ما تطابقت، جرّبي مرة ثانية')).toBeInTheDocument()
    expect(next).toBeDisabled()
    await user.clear(screen.getByLabelText('أعيدي كلمة السر'))
    await user.type(screen.getByLabelText('أعيدي كلمة السر'), 'test password 1')
    expect(next).toBeDisabled() // username "te" is still too short
    await user.type(screen.getByLabelText('اسم المستخدم'), 'st')
    expect(next).toBeEnabled()
    await user.click(next)

    // step 2 — recovery code, hidden first
    expect(await screen.findByRole('heading', { name: 'رمز الاسترجاع' })).toBeInTheDocument()
    expect(txt('الخطوة 2 من 2')).toBeInTheDocument()
    const saved = screen.getByRole('button', { name: 'حفظته' })
    expect(saved).toBeDisabled()
    expect(screen.getByRole('button', { name: 'انسخيه' })).toBeDisabled()
    expect(screen.getByTestId('recovery-code')).not.toHaveTextContent(/[A-Z2-9]{4}/)
    expect(screen.getByText('اظهري الرمز واحفظيه أول، وبعدها يتفعّل الزر.')).toBeInTheDocument()
    expect(api.activate).not.toHaveBeenCalled()
    expect(vault.enabled).toBe(false) // nothing persisted yet
    await user.click(screen.getByRole('button', { name: 'أظهريه' }))
    const code = screen.getByTestId('recovery-code').textContent!.replace(/\s+/g, '')
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{16}$/)
    expect(saved).toBeEnabled()
    expect(screen.getByRole('button', { name: 'انسخيه' })).toBeEnabled()
    await user.click(saved)
    await waitFor(() => expect(api.activate).toHaveBeenCalledTimes(1))
    const prep = (api.activate as ReturnType<typeof vi.fn>).mock.calls[0][0] as PreparedProfile
    expect(prep.recoveryCode).toBe(code)
    expect(prep.profile.username).toBe('test')
  })

  it('«رجوع» from the code returns to step 1 with the fields kept', async () => {
    const api = apiFor(new Vault(mkKv(), 1000))
    const user = userEvent.setup()
    render(wrap(api, <LockSetup name="test" onClose={() => {}} />))
    await user.type(screen.getByLabelText('اسم المستخدم'), 'test')
    await user.type(screen.getByLabelText('كلمة السر', { exact: true }), 'test password 1')
    await user.type(screen.getByLabelText('أعيدي كلمة السر'), 'test password 1')
    await user.click(screen.getByRole('button', { name: 'كمّلي' }))
    await screen.findByRole('heading', { name: 'رمز الاسترجاع' })
    await user.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(await screen.findByRole('heading', { name: 'قفل التطبيق' })).toBeInTheDocument()
  })
})

describe('UnlockScreen', () => {
  it('shows the profile name in <bdi>, a wrong password gets the calm message (value kept), the right one opens', async () => {
    const { vault, profile } = await vaultWithProfile()
    const api = apiFor(vault)
    const onUnlocked = vi.fn()
    const user = userEvent.setup()
    render(wrap(api, <UnlockScreen api={api} profile={profile} onUnlocked={onUnlocked} onForgot={() => {}} />))
    expect(screen.getByRole('heading', { level: 1 }).querySelector('bdi')?.textContent).toBe('test')
    expect(screen.getByLabelText('اسم المستخدم')).toHaveValue('test')
    expect(screen.getByLabelText('اسم المستخدم')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('بياناتك على هالجهاز بس.')).toBeInTheDocument()
    const pw = screen.getByLabelText('كلمة السر', { exact: true })
    await user.type(pw, 'wrong password')
    await user.click(screen.getByRole('button', { name: 'افتحي' }))
    expect(await screen.findByText('كلمة السر ما تطابق. جرّبي مرة ثانية، خذي راحتك.')).toBeInTheDocument()
    expect(pw).toHaveValue('wrong password')
    expect(pw).toHaveAttribute('aria-invalid', 'true')
    expect(onUnlocked).not.toHaveBeenCalled()
    await user.clear(pw)
    await user.type(pw, 'test password 1')
    await user.click(screen.getByRole('button', { name: 'افتحي' }))
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1))
    await onUnlocked.mock.calls[0][0].repo.close()
  })

  it('the 5th wrong password shows the «خذي لك نفس» card, disables the field and the button, keeps the forgot link', async () => {
    const { vault, profile } = await vaultWithProfile('test.wait')
    const api = apiFor(vault)
    const user = userEvent.setup()
    render(wrap(api, <UnlockScreen api={api} profile={profile} onUnlocked={vi.fn()} onForgot={() => {}} />))
    const pw = screen.getByLabelText('كلمة السر', { exact: true })
    for (let i = 0; i < 5; i++) {
      await user.clear(pw)
      await user.type(pw, `nope nope ${i}`)
      await user.click(screen.getByRole('button', { name: /افتحي/ }))
      await waitFor(() => expect(vault.profile(profile.id)!.attempts.failures).toBe(i + 1))
    }
    expect(await screen.findByText('خذي لك نفس')).toBeInTheDocument()
    expect(txt(/تقدرين تجربين بعد \d+ ثانية. أو افتحيه برمز الاسترجاع./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /جرّبي بعد/ })).toBeDisabled()
    expect(pw).toBeDisabled()
    expect(screen.getByRole('button', { name: 'نسيتي كلمة السر؟' })).toBeEnabled()
    expect(screen.queryByText('كلمة السر ما تطابق. جرّبي مرة ثانية، خذي راحتك.')).not.toBeInTheDocument()
  })
})

describe('ProfilePicker', () => {
  const profiles = (): Profile[] => [
    { id: 'a', name: 'وجدان', username: 'test.user', avatar: { kind: 'initial' as const } },
    { id: 'b', name: 'Sara', username: 'sara.a', avatar: { kind: 'initial' as const } },
  ].map((p) => ({ ...p, dbName: p.id, envelope: {} as never, createdAt: '', attempts: { failures: 0, retryAt: 0 } }))

  it('lists profiles (usernames LTR in <bdi>), tapping one picks it, «ملف جديد» adds', async () => {
    const onPick = vi.fn(), onAdd = vi.fn()
    const user = userEvent.setup()
    render(<ProfilePicker profiles={profiles()} onPick={onPick} onAdd={onAdd} />)
    expect(screen.getByRole('heading', { name: 'اختاري ملفك' })).toBeInTheDocument()
    expect(screen.getByText('ما فيه شي ينشارك بين الملفات.')).toBeInTheDocument()
    const tile = screen.getByRole('button', { name: 'Sara · sara.a' })
    expect(within(tile).getByText('sara.a').closest('bdi')).toHaveAttribute('dir', 'ltr')
    await user.click(tile)
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }))
    await user.click(screen.getByRole('button', { name: 'ملف جديد' }))
    expect(onAdd).toHaveBeenCalled()
  })
  it('manage mode: tiles do not unlock, each has a trash button', async () => {
    const onPick = vi.fn(), onDelete = vi.fn()
    const user = userEvent.setup()
    render(<ProfilePicker profiles={profiles()} manage onPick={onPick} onAdd={() => {}} onDelete={onDelete} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Sara · sara.a' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'احذفي ملف Sara' }))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }))
    expect(onPick).not.toHaveBeenCalled()
  })
})

describe('ProfileDeleteSheet (two steps)', () => {
  it('step 1 defaults to keeping; step 2 needs the profile password; a wrong one deletes nothing; the right one deletes', async () => {
    const { vault, profile } = await vaultWithProfile('test.del')
    const removeProfile = vi.fn(async () => {})
    const api = apiFor(vault, { removeProfile })
    const onClose = vi.fn(), onDeleted = vi.fn()
    const user = userEvent.setup()
    render(wrap(api, <ProfileDeleteSheet api={api} profile={profile} onClose={onClose} onDeleted={onDeleted} />))
    const dlg = await screen.findByRole('alertdialog')
    expect(txt('1 من 2')).toBeInTheDocument()
    expect(within(dlg).getByRole('heading', { level: 2 }).textContent).toContain('تحذفين ملف «test»؟')
    for (const t of ['العادات والروتينات والمنتجات', 'المشاريع والملاحظات والقرارات', 'المال والمعاملات والمصادر', 'كلمة السر ورمز الاسترجاع الخاصين فيه']) expect(within(dlg).getByText(t)).toBeInTheDocument()
    expect(within(dlg).getByText('ملفاتك الثانية ما تتأثر أبدًا.')).toBeInTheDocument()
    expect(within(dlg).queryByText('احذفي الملف نهائيًا')).not.toBeInTheDocument()
    await user.click(within(dlg).getByRole('button', { name: 'كمّلي للحذف' }))
    const del = await screen.findByRole('button', { name: 'احذفي الملف نهائيًا' })
    expect(del).toBeDisabled()
    const field = screen.getByLabelText('كلمة سر الملف')
    await user.type(field, 'wrong password')
    expect(del).toBeEnabled()
    await user.click(del)
    expect(await screen.findByText('كلمة السر ما تطابق. جرّبي مرة ثانية، خذي راحتك.')).toBeInTheDocument()
    expect(removeProfile).not.toHaveBeenCalled()
    await user.clear(field)
    await user.type(field, 'test password 1')
    await user.click(screen.getByRole('button', { name: 'احذفي الملف نهائيًا' }))
    await waitFor(() => expect(removeProfile).toHaveBeenCalledWith(profile.id))
    expect(onDeleted).toHaveBeenCalled()
  })
  it('«لا، خلّيه» on step 1 closes without deleting', async () => {
    const { vault, profile } = await vaultWithProfile('test.keep')
    const removeProfile = vi.fn(async () => {})
    const api = apiFor(vault, { removeProfile })
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(wrap(api, <ProfileDeleteSheet api={api} profile={profile} onClose={onClose} onDeleted={() => {}} />))
    await user.click(await screen.findByRole('button', { name: 'لا، خلّيه' }))
    expect(onClose).toHaveBeenCalled()
    expect(removeProfile).not.toHaveBeenCalled()
  })
})

describe('AutoLockSheet', () => {
  it('four radio rows with the approved copy; picking one reports it and closes', async () => {
    const onPick = vi.fn(), onClose = vi.fn()
    const user = userEvent.setup()
    render(<AutoLockSheet open value="min1" onPick={onPick} onClose={onClose} />)
    const group = await screen.findByRole('radiogroup', { name: 'متى يقفل التطبيق؟' })
    expect(within(group).getAllByRole('radio')).toHaveLength(4)
    expect(within(group).getByRole('radio', { name: /بعد دقيقة/ })).toHaveAttribute('aria-checked', 'true')
    expect(within(group).getByText('يعطيك وقت ترجعين له بدون كلمة السر.')).toBeInTheDocument()
    await user.click(within(group).getByRole('radio', { name: /فورًا/ }))
    expect(onPick).toHaveBeenCalledWith('immediate')
    expect(onClose).toHaveBeenCalled()
  })
})
