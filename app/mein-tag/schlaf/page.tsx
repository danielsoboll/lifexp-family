import MeinTagChoicePage from '../../../components/MeinTagChoicePage'
import { AREA_INFO_SUBAREA } from '../../../lib/areaInfoNav'

const CHOICES = [
  { label: 'Gut und lange genug', xp: 10 },
  { label: 'Mittel und/oder zu kurz', xp: 5 },
  { label: 'Schlecht/gar nicht', xp: 0 },
] as const

export default function SchlafPage() {
  return (
    <MeinTagChoicePage
      title="Wie habe ich geschlafen?"
      subtitle="Schlaf für deinen Tag bewerten"
      emoji="😴"
      source="sleep"
      infoSubarea={AREA_INFO_SUBAREA.mein_tag.schlaf}
      headerRingClass="bg-sky-50 ring-sky-100 dark:bg-sky-950/50 dark:ring-sky-800/60"
      choices={[...CHOICES]}
    />
  )
}
