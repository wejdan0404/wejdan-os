import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { MeIcon, RowIcon } from './meKit'
import styles from './me.module.css'

/** Help & Safety — numbers first, crystal clear; copy carried from the verified Flutter build. */
export default function HelpScreen() {
  return (
    <Screen title="المساعدة والسلامة" compactTitle="المساعدة">
      <section className={styles.emergency} aria-labelledby="emergency-title">
        <h2 id="emergency-title" className={styles.emergencyTitle}>
          في الطوارئ اتصلي على طول
        </h2>
        <div className={styles.callRow}>
          <a className={styles.callBtn} href="tel:997" aria-label="اتصلي بالإسعاف 997">
            <MeIcon name="phone" size={20} />
            <span>الإسعاف</span>
            <bdi dir="ltr" className={styles.callNum}>
              997
            </bdi>
          </a>
          <a className={styles.callBtn} href="tel:911" aria-label="اتصلي بالطوارئ الموحد 911">
            <MeIcon name="phone" size={20} />
            <span>الطوارئ الموحد</span>
            <bdi dir="ltr" className={styles.callNum}>
              911
            </bdi>
          </a>
        </div>
        <p className={styles.lede}>إذا جتك أفكار إنك تأذين نفسك — اتصلي على 911 أو روحي للطوارئ الحين.</p>
      </section>

      <InsetGroupedList header="أرقام تساعدك">
        <TelRow number="937" title="وزارة الصحة" subtitle="استشارات صحية على مدار الساعة" />
        <TelRow number="920033360" title="خدمات الصحة النفسية" subtitle="وزارة الصحة" />
      </InsetGroupedList>

      <InsetGroupedList header="متى أحتاج مختص؟" footer="إذا حسيتي إن الأمور أثقل من العادة لفترة، كلامك مع مختص خطوة قوية.">
        <ListRow leading={<RowIcon name="help" tone="ink" />} title="إذا الضيق أو القلق أو التوتر مستمر ويأثر على يومك." />
        <ListRow leading={<RowIcon name="help" tone="ink" />} title="إذا صار صعب تهتمين بأساسياتك: النوم، الأكل، الشغل أو الدراسة." />
        <ListRow leading={<RowIcon name="help" tone="warn" />} title="إذا جتك أفكار إنك تأذين نفسك — روحي للطوارئ الحين." />
      </InsetGroupedList>

      <p className={styles.note}>
        <MeIcon name="shield" size={16} />
        <span>هذا التطبيق مو بديل عن المختص. ما يشخّص ولا يتابع حالتك النفسية — يساعدك في يومك بس.</span>
      </p>

      <InsetGroupedList header="مصادر الأرقام">
        <ListRow muted title={<><bdi dir="ltr">997</bdi> — خطة الترقيم الوطنية، هيئة الاتصالات والفضاء والتقنية</>} />
        <ListRow muted title={<><bdi dir="ltr">911</bdi> — موقع هيئة الهلال الأحمر السعودي</>} />
        <ListRow muted title={<><bdi dir="ltr">937</bdi> — صفحة خدمة 937، وزارة الصحة</>} />
        <ListRow muted title={<><bdi dir="ltr">920033360</bdi> — صفحة خدمات الصحة النفسية، وزارة الصحة</>} />
      </InsetGroupedList>
    </Screen>
  )
}

/** A whole row that dials: one big target, named by its action («اتصلي على …»). */
function TelRow({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div role="listitem" data-has-leading="">
      <a className={styles.telRow} href={`tel:${number}`} aria-label={`اتصلي على ${title} ${number}`}>
        <RowIcon name="phone" />
        <span className={styles.telText}>
          <span className={styles.telTitle}>{title}</span>
          <span className={styles.telSub}>{subtitle}</span>
        </span>
        <bdi dir="ltr" className={styles.telNum}>
          {number}
        </bdi>
      </a>
    </div>
  )
}
