import LegalPage from '../../components/LegalPage'
import { HAFTUNG_SECTIONS } from '../../lib/legalContent'

export const metadata = {
  title: 'Haftung — LifeXP',
  description: 'Haftungsausschluss und rechtliche Hinweise für LifeXP.',
}

export default function HaftungPage() {
  return <LegalPage title="Haftung" sections={HAFTUNG_SECTIONS} />
}
