import AreaInfoPage from '../../../../../components/AreaInfoPage'

export default function AufgabenplanerWocheInfoPage() {
  return (
    <AreaInfoPage
      area="aufgabenplaner"
      title="Wochenplan"
      emoji="📅"
      backHref="/plus/aufgabenplaner/woche"
      fetchOptions={{ subarea: 'Woche' }}
    />
  )
}
