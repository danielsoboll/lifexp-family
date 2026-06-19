import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="bewegung"
      title="Schritte"
      emoji="🚶"
      backHref="/bewegung/schritte"
      fetchOptions={{ subarea: 'Schritte' }}
    />
  )
}
