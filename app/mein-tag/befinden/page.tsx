import MeinTagChoicePage from '../../../components/MeinTagChoicePage'
import { AREA_INFO_SUBAREA } from '../../../lib/areaInfoNav'

const LEGACY_WELLBEING_LABELS: Record<string, string> = {
  'Hochmotiviert 💪': 'Fit und hochmotiviert 💪',
  'Ziehe durch halt 😉': "Ganz gut - weiter geht's",
}

const CHOICES = [
  { label: 'Fit und hochmotiviert 💪', xp: 5 },
  { label: "Ganz gut - weiter geht's", xp: 2 },
  { label: 'Keine Lust/krank heute 🤒', xp: 0 },
] as const

export default function BefindenPage() {
  return (
    <MeinTagChoicePage
      title="Befinden"
      subtitle="Wie geht es dir heute?"
      emoji="🙂"
      source="wellbeing"
      infoSubarea={AREA_INFO_SUBAREA.mein_tag.wellbeing}
      legacyLabelMap={LEGACY_WELLBEING_LABELS}
      choices={[...CHOICES]}
    />
  )
}
