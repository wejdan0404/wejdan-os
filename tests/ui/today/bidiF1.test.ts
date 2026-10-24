import { describe, expect, it } from 'vitest'
import { splitBidi } from '../../../src/ui/components/Bidi'
import { isolate, sparksText } from '../../../src/ui/screens/today/lib'

describe('bidi: thousands separators stay inside one LTR run', () => {
  it('keeps «1,000» and «8,000-10,000» whole', () => {
    expect(splitBidi('1,000 خطوة').filter((p) => p.ltr).map((p) => p.text)).toEqual(['1,000'])
    expect(splitBidi('بين 8,000-10,000 خطوة').filter((p) => p.ltr).map((p) => p.text)).toEqual(['8,000-10,000'])
    expect(splitBidi('test 1,000 كلمة').filter((p) => p.ltr).map((p) => p.text)).toEqual(['test 1,000'])
  })
  it('a trailing comma after a run is not swallowed', () => {
    expect(splitBidi('IELTS، ثم Absher, وبس').filter((p) => p.ltr).map((p) => p.text)).toEqual(['IELTS', 'Absher'])
  })
  it('isolate() wraps the whole number', () => {
    expect(isolate('7,000 خطوة')).toBe('⁦7,000⁩ خطوة')
  })
  it('spark counts agree in Arabic', () => {
    expect(sparksText(1)).toBe('شرارة')
    expect(sparksText(2)).toBe('شرارتين')
    expect(sparksText(5)).toBe('5 شرارات')
    expect(sparksText(12)).toBe('12 شرارة')
  })
})
