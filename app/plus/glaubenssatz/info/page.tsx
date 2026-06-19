import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="plus"
      title="Glaubenssatz"
      emoji="✨"
      backHref="/plus/glaubenssatz"
      fetchOptions={{ subarea: 'Glaubenssatz' }}
    />
  )
}
