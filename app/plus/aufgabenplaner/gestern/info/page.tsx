import AreaInfoPage from '../../../../../components/AreaInfoPage'

export default function AufgabenplanerGesternInfoPage() {
  return (
    <AreaInfoPage
      area="aufgabenplaner"
      title="Gestern"
      emoji="📋"
      backHref="/plus/aufgabenplaner/gestern"
      fetchOptions={{ subarea: 'Gestern' }}
    />
  )
}
