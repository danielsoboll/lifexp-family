import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="mein_tag"
      title="Sonne/frische Luft"
      emoji="☀️"
      backHref="/mein-tag/sonne-frische-luft"
      fetchOptions={{ subarea: 'Sonne/frische Luft' }}
    />
  )
}
