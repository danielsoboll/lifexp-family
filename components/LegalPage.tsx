import Link from 'next/link'
import { Fragment } from 'react'

import { CARD_SURFACE_CLASS, MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../lib/appShell'
import type { LegalSection } from '../lib/legalContent'
import LegalFooterNav from './LegalFooterNav'
import ThemeToggle from './ThemeToggle'

type LegalPageProps = {
  title: string
  sections: LegalSection[]
}

const LEGAL_LINK_CLASS =
  'font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:decoration-emerald-400/40 dark:hover:text-emerald-300'

function renderLegalParagraph(paragraph: string) {
  const emailMatch = paragraph.match(/^(E-Mail:\s*)([^\s]+@[^\s]+)$/)
  if (emailMatch) {
    const [, prefix, email] = emailMatch
    return (
      <p>
        {prefix}
        <a href={`mailto:${email}`} className={LEGAL_LINK_CLASS}>
          {email}
        </a>
      </p>
    )
  }

  return <p>{paragraph}</p>
}

export default function LegalPage({ title, sections }: LegalPageProps) {
  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className={`${PILL_BACK_CLASS} mb-0`}>
            <span aria-hidden>←</span>
            Zurück
          </Link>
          <ThemeToggle />
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
        </header>

        <article className={`space-y-6 rounded-2xl p-5 ${CARD_SURFACE_CLASS}`}>
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-950 dark:text-slate-300">
                {section.paragraphs.map((paragraph) => (
                  <Fragment key={paragraph}>{renderLegalParagraph(paragraph)}</Fragment>
                ))}
                {section.listItems ? (
                  <ul className="list-disc space-y-1.5 pl-5">
                    {section.listItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </article>

        <LegalFooterNav className="mt-8" />
      </div>
    </main>
  )
}
