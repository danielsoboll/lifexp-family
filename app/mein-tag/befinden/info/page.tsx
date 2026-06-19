import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="mein_tag"
      title="Befinden"
      emoji="🙂"
      backHref="/mein-tag/befinden"
      fetchOptions={{ subarea: 'Befinden' }}
    />
  )
}
