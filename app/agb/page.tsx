import LegalPage from '../../components/LegalPage'
import { AGB_SECTIONS } from '../../lib/legalContent'

export const metadata = {
  title: 'AGB — LifeXP Family',
  description: 'Allgemeine Geschäftsbedingungen für LifeXP Family und LifeXP Family PLUS.',
}

export default function AgbPage() {
  return <LegalPage title="AGB" sections={AGB_SECTIONS} />
}
