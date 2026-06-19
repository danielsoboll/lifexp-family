import AreaInfoPage from '../../../../components/AreaInfoPage'

export default function InfoPage() {
  return (
    <AreaInfoPage
      area="ernaehrung"
      title="Grob schätzen"
      emoji="🥗"
      backHref="/ernaehrung/grob"
      fetchOptions={{ subarea: 'Grob schätzen' }}
    />
  )
}
