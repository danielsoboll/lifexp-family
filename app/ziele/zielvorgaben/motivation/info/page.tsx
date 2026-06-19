import AreaInfoPage from '../../../../../components/AreaInfoPage'

export default function ZielvorgabenMotivationInfoPage() {
  return (
    <AreaInfoPage
      area="motivation"
      fetchOptions={{ subarea: 'Ziele' }}
      title="Motivation"
      emoji="💪"
      backHref="/ziele/zielvorgaben"
    />
  )
}
