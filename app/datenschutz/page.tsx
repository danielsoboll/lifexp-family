import LegalPage from '../../components/LegalPage'
import { DATENSCHUTZ_SECTIONS } from '../../lib/legalContent'

export const metadata = {
  title: 'Datenschutz — LifeXP Family',
  description: 'Datenschutzerklärung für LifeXP Family.',
}

export default function DatenschutzPage() {
  return <LegalPage title="Datenschutz" sections={DATENSCHUTZ_SECTIONS} />
}
