import AreaInfoPage from '../../../../../components/AreaInfoPage'

export default function ZielvorgabenAlkoholInfoPage() {
  return (
    <AreaInfoPage
      area="alkohol"
      fetchOptions={{ subarea: 'Ziele' }}
      title="Alkohol mit tracken?"
      emoji="🍺"
      backHref="/ziele/zielvorgaben"
    />
  )
}
