import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="bewegung"
      title="Training"
      emoji="💪"
      backHref="/bewegung/training"
      fetchOptions={{ subarea: 'Training' }}
    />
  )
}
