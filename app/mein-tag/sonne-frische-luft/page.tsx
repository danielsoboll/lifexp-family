import MeinTagChoicePage from '../../../components/MeinTagChoicePage'
import { AREA_INFO_SUBAREA } from '../../../lib/areaInfoNav'

const CHOICES = [
  { label: 'Ich war entspannt draussen unterwegs', xp: 5 },
  { label: 'Mal paar Minütchen Pause in der Sonne', xp: 2 },
  { label: 'Keine Zeit heute', xp: 0 },
] as const

export default function SonneFrischeLuftPage() {
  return (
    <MeinTagChoicePage
      title="Sonne und frische Luft"
      subtitle="Etwas Freiheit für deinen Tag"
      emoji="☀️"
      source="sun_air"
      infoSubarea={AREA_INFO_SUBAREA.mein_tag.sunAir}
      headerRingClass="bg-amber-50 ring-amber-100 dark:bg-amber-950/50 dark:ring-amber-800/60"
      choices={[...CHOICES]}
    />
  )
}
