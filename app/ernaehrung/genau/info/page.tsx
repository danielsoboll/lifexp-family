import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="ernaehrung"
      title="Genau"
      emoji="🥗"
      backHref="/ernaehrung/genau"
      fetchOptions={{ subarea: 'Genau' }}
    />
  )
}
