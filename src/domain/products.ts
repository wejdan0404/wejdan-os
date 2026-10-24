/**
 * «منتجاتي» — her care products and the AM/PM routines generated from them
 * (web-only). Each active AM/PM product becomes a step of the morning / night
 * care routine in its `order`; weekly products are listed for the week.
 * The seed ships generic, editable placeholders (no brands — she names them).
 */
import { cmpNum, cmpStr } from './core/dates';
import type { DomainId, Product, ProductCategory, ProductSlot, Routine } from './models';
import { anchor, makeProduct, makeRoutine, makeRoutineStep } from './models';

export const kProductsAmRoutineId = 'r_products_am';
export const kProductsPmRoutineId = 'r_products_pm';

/** Arabic label per category (Saudi friendly). */
export const kProductCategoryAr: Readonly<Record<ProductCategory, string>> = {
  cleanser: 'غسول',
  toner: 'تونر',
  serum: 'سيروم',
  moisturizer: 'مرطب',
  sunscreen: 'واقي شمس',
  shampoo: 'شامبو',
  conditioner: 'بلسم',
  heat_protectant: 'واقي حرارة',
  hair_oil: 'زيت شعر',
  toothpaste: 'معجون أسنان',
  floss: 'خيط أسنان',
  mouthwash: 'غسول فم',
  mask: 'ماسك',
  exfoliant: 'مقشّر',
  body: 'للجسم',
  other: 'منتج',
};

const DENTAL: ReadonlySet<ProductCategory> = new Set(['toothpaste', 'floss', 'mouthwash']);

/** Generic placeholders seeded on first run — she renames them to her real products. */
export function placeholderProducts(): Product[] {
  const p = (id: string, name: string, category: ProductCategory, slot: ProductSlot, order: number): Product =>
    makeProduct({ id, name, category, slot, order, placeholder: true });
  return [
    p('pr_am_cleanser', 'غسول', 'cleanser', 'am', 1),
    p('pr_am_moisturizer', 'مرطب', 'moisturizer', 'am', 2),
    p('pr_am_sunscreen', 'واقي شمس SPF 30+', 'sunscreen', 'am', 3),
    p('pr_am_toothpaste', 'معجون فلورايد', 'toothpaste', 'am', 4),
    p('pr_pm_cleanser', 'غسول', 'cleanser', 'pm', 1),
    p('pr_pm_moisturizer', 'مرطب', 'moisturizer', 'pm', 2),
    p('pr_pm_toothpaste', 'معجون فلورايد', 'toothpaste', 'pm', 3),
    p('pr_pm_floss', 'خيط أسنان', 'floss', 'pm', 4),
    p('pr_wk_shampoo', 'شامبو', 'shampoo', 'weekly', 1),
    p('pr_wk_conditioner', 'بلسم', 'conditioner', 'weekly', 2),
    p('pr_wk_heat', 'واقي حرارة', 'heat_protectant', 'weekly', 3),
  ];
}

/**
 * Her active products of [slot] in step order. The seeded generic placeholders are only
 * suggestions («اقتراحات منتجات») — they never form her routine or a Today suggestion until she
 * adds them as her own (QA area 2 #1).
 */
export function productsIn(products: Product[], slot: ProductSlot): Product[] {
  return products
    .filter((p) => p.active && !p.placeholder && p.slot === slot)
    .sort((a, b) => cmpNum(a.order, b.order) || cmpStr(a.id, b.id));
}

/** True when she has at least one product of her own that can form an AM/PM routine. */
export const hasOwnRoutineProducts = (products: Product[]): boolean =>
  products.some((p) => p.active && !p.placeholder && (p.slot === 'am' || p.slot === 'pm'));

const kProductStepPrefix = 'ps_';

/**
 * A plan item that points at a product step which no longer belongs to her routine (a seeded
 * placeholder she never adopted, a deleted or switched-off product). Such items drop out of her
 * day quietly — the product itself and its history stay untouched.
 */
export function isStaleProductStep(item: { itemId: string; kind: string }, products: Product[]): boolean {
  if (item.kind !== 'routineStep' || !item.itemId.startsWith(kProductStepPrefix)) return false;
  const p = products.find((x) => x.id === item.itemId.slice(kProductStepPrefix.length));
  return p == null || p.placeholder || !p.active;
}

const productDomain = (_p: Product): DomainId => 'care';

/** Routine step id for a product (completion is logged against it). */
export const productStepId = (productId: string): string => `${kProductStepPrefix}${productId}`;

/**
 * AM (after wake) and PM (an hour before sleep) care routines built from her
 * active products. Empty slots produce no routine.
 */
export function productRoutines(products: Product[], pausedSlots: readonly ProductSlot[] = []): Routine[] {
  const out: Routine[] = [];
  const build = (slot: 'am' | 'pm'): Routine | null => {
    if (pausedSlots.includes(slot)) return null;
    const list = productsIn(products, slot);
    if (list.length === 0) return null;
    return makeRoutine({
      id: slot === 'am' ? kProductsAmRoutineId : kProductsPmRoutineId,
      titleAr: slot === 'am' ? 'روتين الصبح' : 'روتين المسا',
      titleEn: slot === 'am' ? 'Morning care routine' : 'Night care routine',
      section: slot === 'am' ? 'morningChain' : 'eveningChain',
      anchor: slot === 'am' ? anchor({ type: 'wake', offsetMin: 10 }) : anchor({ type: 'sleep', offsetMin: -45 }),
      steps: list.map((p) =>
        makeRoutineStep({
          id: productStepId(p.id),
          titleAr: p.name.trim() === '' ? kProductCategoryAr[p.category] : p.name,
          titleEn: p.name,
          domain: productDomain(p),
          durationMin: DENTAL.has(p.category) ? 2 : 1,
          minimumDurationMin: 1,
          // Teeth care is kept on a gentle (Red) day.
          essential: DENTAL.has(p.category),
        }),
      ),
    });
  };
  const am = build('am');
  const pm = build('pm');
  if (am) out.push(am);
  if (pm) out.push(pm);
  return out;
}
