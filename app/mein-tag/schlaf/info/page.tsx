import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="mein_tag"
      title="Schlaf"
      emoji="😴"
      backHref="/mein-tag/schlaf"
      fetchOptions={{ subarea: 'Schlaf' }}
    />
  )
}
