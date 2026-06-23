import HappyAllPortrait from './HappyAllPortrait'

type FamilyGroupPortraitProps = {
  className?: string
  cycle?: boolean
}

export default function FamilyGroupPortrait({ className = '', cycle = false }: FamilyGroupPortraitProps) {
  return <HappyAllPortrait className={className} cycle={cycle} />
}
