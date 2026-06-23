import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

/**
 * iOS/iPadOS: „Autofill Contact“-Leiste bei Textfeldern unterdrücken.
 * `off` reicht oft nicht — `new-password` bei type=text ist der zuverlässige Trick.
 */
const IOS_SUPPRESS_CONTACT_AUTOCOMPLETE = 'new-password' as const

/** Gemeinsame Input-Attribute gegen iOS-Kontakt-/Passwort-Autofill auf Nicht-Login-Feldern. */
export type AutofillInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'autoComplete' | 'autoCorrect' | 'autoCapitalize' | 'spellCheck' | 'name'
>

type AutofillTextareaProps = Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'autoComplete' | 'autoCorrect' | 'autoCapitalize' | 'spellCheck' | 'name'
>

/** Anzeigename im Onboarding — neutrale Attribute (iOS Kontakt-Leiste). */
export function personLabelInputProps(): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'text',
    autoComplete: 'one-time-code',
    autoCorrect: 'off',
    autoCapitalize: 'words',
    spellCheck: false,
    name: 'lifexp-who-label-field',
  }
}

/** Familientitel beim Anlegen — neutrale `name`/id ohne „family-name“. */
export function familyTitleInputProps(): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'text',
    autoComplete: IOS_SUPPRESS_CONTACT_AUTOCOMPLETE,
    autoCorrect: 'off',
    autoCapitalize: 'words',
    spellCheck: false,
    name: 'lifexp-family-title-field',
  }
}

/** Anzeigename / „Wie heißt du?“ – kein Kontakt-Autofill (iOS). */
export function displayNameInputProps(): AutofillInputProps {
  return personLabelInputProps()
}

/** Namens-Korrektur nach Konflikt — ohne Kontakt-/Autofill-Leiste (iOS). */
export function displayNameConflictInputProps(): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'text',
    autoComplete: IOS_SUPPRESS_CONTACT_AUTOCOMPLETE,
    autoCorrect: 'off',
    autoCapitalize: 'words',
    spellCheck: false,
    name: 'lifexp-conflict-rename-field',
  }
}

/** Freitext einzeilig (Familienname, Quest-Titel, Codes …). */
export function oneLineTextInputProps(fieldName: string): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'text',
    autoComplete: IOS_SUPPRESS_CONTACT_AUTOCOMPLETE,
    autoCorrect: 'off',
    autoCapitalize: 'sentences',
    spellCheck: false,
    name: fieldName,
  }
}

/** Mehrzeiliger Freitext (Quest-Notiz …). */
export function multilineTextInputProps(fieldName: string): AutofillTextareaProps {
  return {
    autoComplete: IOS_SUPPRESS_CONTACT_AUTOCOMPLETE,
    autoCorrect: 'off',
    autoCapitalize: 'sentences',
    spellCheck: false,
    name: fieldName,
  }
}

/** Ganzzahlen (Alter, kcal, XP …) — type=tel würde auf iOS Telefon/Kontakte anbieten. */
export function integerInputProps(fieldName: string): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'numeric',
    autoComplete: IOS_SUPPRESS_CONTACT_AUTOCOMPLETE,
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    name: fieldName,
  }
}

/** Dezimalzahlen (Protein, Alkohol-Menge …). */
export function decimalInputProps(fieldName: string): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'decimal',
    autoComplete: IOS_SUPPRESS_CONTACT_AUTOCOMPLETE,
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    name: fieldName,
  }
}

/** Datumsauswahl (kein Geburtstags-/Kontakt-Autofill). */
export function dateInputProps(): AutofillInputProps {
  return {
    type: 'date',
    autoComplete: IOS_SUPPRESS_CONTACT_AUTOCOMPLETE,
    name: 'lifexp-date',
  }
}
