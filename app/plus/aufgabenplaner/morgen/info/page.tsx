import AreaInfoPage from '../../../../../components/AreaInfoPage'

export default function AufgabenplanerMorgenInfoPage() {
  return (
    <AreaInfoPage
      area="aufgabenplaner"
      title="Morgen"
      emoji="📋"
      backHref="/plus/aufgabenplaner/morgen"
      fetchOptions={{ subarea: 'Morgen' }}
    />
  )
}
