import MovementChoicePage from '../../../components/MovementChoicePage'

export default function BewegungSchrittePage() {
  return (
    <MovementChoicePage
      title="Wie viele Schritte waren es?"
      subtitle="Schritte"
      emoji="🚶"
      source="schritte"
      choices={[
        { label: '12.000+', xp: 15 },
        { label: '8.000+', xp: 10 },
        { label: '6.000+', xp: 5 },
        { label: '4.000+', xp: 2 },
        { label: '<4.000', xp: 0 },
      ]}
    />
  )
}
