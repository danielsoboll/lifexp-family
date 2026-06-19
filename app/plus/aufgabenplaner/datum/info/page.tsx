import AreaInfoPage from '../../../../../components/AreaInfoPage'

export default function AufgabenplanerDatumInfoPage() {
  return (
    <AreaInfoPage
      area="aufgabenplaner"
      title="Datum"
      emoji="📋"
      backHref="/plus/aufgabenplaner/datum"
      fetchOptions={{ subarea: 'Datum' }}
    />
  )
}
