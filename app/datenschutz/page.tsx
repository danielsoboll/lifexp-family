import LegalPage from '../../components/LegalPage'
import { DATENSCHUTZ_SECTIONS } from '../../lib/legalContent'

export const metadata = {
  title: 'Datenschutz — LifeXP',
  description: 'Datenschutzerklärung für LifeXP.',
}

export default function DatenschutzPage() {
  return <LegalPage title="Datenschutz" sections={DATENSCHUTZ_SECTIONS} />
}
