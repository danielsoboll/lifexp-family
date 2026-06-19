import MovementChoicePage from '../../../components/MovementChoicePage'

export default function BewegungArbeitPage() {
  return (
    <MovementChoicePage
      title="Was hast du heute gemacht?"
      subtitle="Arbeit"
      emoji="🧰"
      source="arbeit"
      choices={[
        { label: 'harte körperliche Arbeit', xp: 10 },
        { label: 'mittlere körperliche Arbeit', xp: 5 },
        { label: 'etwas körperliche Arbeit/Haushalt', xp: 3 },
        { label: 'Bürojob', xp: 2 },
        { label: 'Frei', xp: 0 },
      ]}
    />
  )
}
