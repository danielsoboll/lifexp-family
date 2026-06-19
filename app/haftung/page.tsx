import LegalPage from '../../components/LegalPage'
import { HAFTUNG_SECTIONS } from '../../lib/legalContent'

export const metadata = {
  title: 'Haftung — LifeXP Family',
  description: 'Haftungsausschluss und rechtliche Hinweise für LifeXP Family.',
}

export default function HaftungPage() {
  return <LegalPage title="Haftung" sections={HAFTUNG_SECTIONS} />
}
