import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="plus"
      title="Motivation"
      emoji="💪"
      backHref="/plus/motivation"
      fetchOptions={{ subarea: 'Motivation' }}
    />
  )
}
