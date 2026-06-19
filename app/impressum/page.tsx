import LegalPage from '../../components/LegalPage'
import { IMPRESSUM_SECTIONS } from '../../lib/legalContent'

export const metadata = {
  title: 'Impressum — LifeXP Family',
  description: 'Impressum und Anbieterkennzeichnung für LifeXP Family.',
}

export default function ImpressumPage() {
  return <LegalPage title="Impressum" sections={IMPRESSUM_SECTIONS} />
}
