import { describe, expect, it } from 'vitest'
import { splitBidi } from '../../../src/ui/components/Bidi'
import { isolate } from '../../../src/ui/screens/today/lib'
import { isoText } from '../../../src/ui/screens/habits/shared'

/** Release gate 3 / D5: Unicode-aware LTR runs. Each row: the text and the LTR runs that must come out whole. All strings are generic. */
const CASES: [string, string[]][] = [
  ['Embryolisse Lait-Crème Concentré', ['Embryolisse Lait-Crème Concentré']],
  ['كريم Lait-Crème Concentré للوجه', ['Lait-Crème Concentré']],
  ['مرطّب Crème Légère بعد الغسول', ['Crème Légère']],
  ['سيروم Café Noël', ['Café Noël']],
  ['منتج Señor Müller Åre', ['Señor Müller Åre']],
  ['واقي Bioderma Photoderm', ['Bioderma Photoderm']],
  ['سيروم Cre\u0300me de\u0301compose\u0301 للوجه', ['Cre\u0300me de\u0301compose\u0301']],
  ['كريم Œuvre et Æther', ['Œuvre et Æther']],
  ['ligature ﬁne ﬂow داخل نص', ['ligature ﬁne ﬂow']],
  ['غسول Test\u200CName للوجه', ['Test\u200CName']],
  ['قبل 3 أيام', ['3']],
  ['بعد 06:30 الصبح', ['06:30']],
  ['من 30–45 دقيقة', ['30–45']],
  ['بين 30-45 د', ['30-45']],
  ['بين 8,000-10,000 خطوة', ['8,000-10,000']],
  ['السعر $25 فقط', ['$25']],
  ['السعر €1,200 فقط', ['€1,200']],
  ['واقي SPF 30+ للصيف', ['SPF 30+']],
  ['SPF50+ PA++++ ممتاز', ['SPF50+ PA++++']],
  ['مكوّن (Niacinamide) 10% للبشرة', ['Niacinamide', '10%']],
  ['حجم (50 ml) صغير', ['50 ml']],
  ['كريم AM/PM للوجه', ['AM/PM']],
  ['كريم L\'Oréal Paris هدية', ['L\'Oréal Paris']],
  ['كريم L’Occitane هدية', ['L’Occitane']],
  ['عرض Marks & Spencer اليوم', ['Marks & Spencer']],
  ['موقع my.gov.sa للتجديد', ['my.gov.sa']],
  ['IELTS، ثم Absher, وبس', ['IELTS', 'Absher']],
  ['اشتريت Dr. Jart+ Cicapair', ['Dr. Jart+ Cicapair']],
  ['أبغى CeraVe و La Roche-Posay سوا', ['CeraVe', 'La Roche-Posay']],
  ['خلصت Oral-B Pro 2 اليوم', ['Oral-B Pro 2']],
  ['Vitamin C 15% + Ferulic', ['Vitamin C 15%', 'Ferulic']],
  ['كلمات عربية فقط بدون لاتيني', []],
  ['٣٠–٤٥ دقيقة بأرقام عربية', []],
  ['trailing dash - وبس', ['trailing dash']],
  ['نص ينتهي بفاصلة Absher،', ['Absher']],
]

describe('bidi G3: Unicode-aware LTR runs', () => {
  it.each(CASES)('%s', (text, runs) => {
    const parts = splitBidi(text)
    expect(parts.filter((p) => p.ltr).map((p) => p.text)).toEqual(runs)
    // lossless: concatenating the parts gives the input back
    expect(parts.map((p) => p.text).join('')).toBe(text)
  })

  it('has at least 25 table rows', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(25)
  })

  it('an accented product name is ONE isolate, not three', () => {
    expect(splitBidi('Embryolisse Lait-Crème Concentré').filter((p) => p.ltr)).toHaveLength(1)
    expect(isolate('كريم Lait-Crème Concentré')).toBe('كريم ⁦Lait-Crème Concentré⁩')
    expect(isoText('Lait-Crème Concentré')).toBe('⁦Lait-Crème Concentré⁩')
  })
})
