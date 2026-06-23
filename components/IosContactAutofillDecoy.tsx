/** Unsichtbares Köderfeld — iOS Kontakt-Autofill oft auf dem zweiten Namensfeld; fängt es ab. */
export default function IosContactAutofillDecoy() {
  return (
    <input
      type="text"
      name="lifexp-ios-contact-decoy"
      autoComplete="name"
      tabIndex={-1}
      aria-hidden
      readOnly
      defaultValue=""
      className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px opacity-0"
    />
  )
}
