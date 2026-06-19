import type { InputHTMLAttributes } from 'react'

/** Gemeinsame Input-Attribute gegen iOS-Passwort-Autofill auf Nicht-Login-Feldern. */
type AutofillInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'autoComplete' | 'autoCorrect' | 'autoCapitalize' | 'spellCheck' | 'name'
>

/** Anzeigename / „Wie heißt du?“ – kein Login-/Kontakt-Autofill (iOS). */
export function displayNameInputProps(): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'text',
    // iOS: „nickname“/„name“ öffnet Kontakt-Autofill; „new-password“ unterdrückt die Leiste bei type=text.
    autoComplete: 'new-password',
    autoCorrect: 'off',
    autoCapitalize: 'words',
    spellCheck: false,
    name: 'lifexp-onboarding-display-name-field',
  }
}

/** Namens-Korrektur nach Konflikt — ohne Kontakt-/Autofill-Leiste (iOS). */
export function displayNameConflictInputProps(): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'text',
    // iOS: „new-password“ unterdrückt Kontakt-/Autofill-Leiste bei type=text.
    autoComplete: 'new-password',
    autoCorrect: 'off',
    autoCapitalize: 'words',
    spellCheck: false,
    name: 'lifexp-conflict-rename-field',
  }
}

/** Freitext (Aufgaben, Gerichte, Zieltext …). */
export function oneLineTextInputProps(fieldName: string): AutofillInputProps {
  return {
    type: 'text',
    inputMode: 'text',
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'sentences',
    spellCheck: false,
    name: fieldName,
  }
}

/** Ganzzahlen (Alter, kcal, XP …). */
export function integerInputProps(fieldName: string): AutofillInputProps {
  return {
    type: 'tel',
    inputMode: 'numeric',
    autoComplete: 'off',
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
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    name: fieldName,
  }
}

/** Datumsauswahl (kein Geburtstags-Autofill). */
export function dateInputProps(): AutofillInputProps {
  return {
    type: 'date',
    autoComplete: 'off',
    name: 'lifexp-date',
  }
}
