import AreaInfoPage from '../../../../../components/AreaInfoPage'

export default function AufgabenplanerHeuteInfoPage() {
  return (
    <AreaInfoPage
      area="aufgabenplaner"
      title="Heute"
      emoji="📋"
      backHref="/plus/aufgabenplaner/heute"
      fetchOptions={{ subarea: 'Heute' }}
    />
  )
}
