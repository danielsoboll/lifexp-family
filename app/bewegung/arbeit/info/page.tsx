import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="bewegung"
      title="Arbeit"
      emoji="🧰"
      backHref="/bewegung/arbeit"
      fetchOptions={{ subarea: 'Arbeit' }}
    />
  )
}
