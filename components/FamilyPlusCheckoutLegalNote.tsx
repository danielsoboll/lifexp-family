import Link from 'next/link'

import { LEGAL_PLUS_CHECKOUT_PREFIX } from '../lib/legalContent'

type FamilyPlusCheckoutLegalNoteProps = {
  className?: string
}

export default function FamilyPlusCheckoutLegalNote({ className = '' }: FamilyPlusCheckoutLegalNoteProps) {
  return (
    <p className={`text-center text-[11px] leading-relaxed text-slate-800 dark:text-slate-400 ${className}`}>
      {LEGAL_PLUS_CHECKOUT_PREFIX}{' '}
      <Link href="/agb" className="font-medium underline underline-offset-2">
        AGB
      </Link>{' '}
      und{' '}
      <Link href="/datenschutz" className="font-medium underline underline-offset-2">
        Datenschutzhinweise
      </Link>
      .
    </p>
  )
}
