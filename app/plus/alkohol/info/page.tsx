import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="plus"
      title="Alkohol"
      emoji="🍺"
      backHref="/plus/alkohol"
      fetchOptions={{ subarea: 'Alkohol' }}
    />
  )
}
