export type LegalSection = {
  title: string
  paragraphs: string[]
  listItems?: string[]
}

export const IMPRESSUM_SECTIONS: LegalSection[] = [
  {
    title: 'Angaben gemäß § 5 DDG',
    paragraphs: [
      'SLC IT-Consulting GmbH',
      'Wenkenstr. 67',
      '32105 Bad Salzuflen',
      'Deutschland',
    ],
  },
  {
    title: 'Vertreten durch',
    paragraphs: ['Geschäftsführer: Dipl.-Ing. (FH) Daniel Soboll'],
  },
  {
    title: 'Kontakt',
    paragraphs: ['E-Mail: d.soboll@slc-it.de'],
  },
  {
    title: 'Registereintrag',
    paragraphs: [
      'Eintragung im Handelsregister.',
      'Registergericht: Amtsgericht Detmold',
      'Registernummer: HRB 8476',
    ],
  },
  {
    title: 'Umsatzsteuer-ID',
    paragraphs: [
      'Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:',
      'DE286958761',
    ],
  },
  {
    title: 'Steuer-Identifikationsnummer',
    paragraphs: ['313/5802/1643'],
  },
  {
    title: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
    paragraphs: [
      'Dipl.-Ing. (FH) Daniel Soboll',
      'SLC IT-Consulting GmbH',
      'Wenkenstr. 67, 32105 Bad Salzuflen',
    ],
  },
  {
    title: 'EU-Streitschlichtung',
    paragraphs: [
      'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/',
      'Unsere E-Mail-Adresse finden Sie oben im Impressum.',
    ],
  },
  {
    title: 'Verbraucherstreitbeilegung / Universalschlichtungsstelle',
    paragraphs: [
      'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    ],
  },
  {
    title: 'Haftungshinweis',
    paragraphs: [
      'Ausführliche Hinweise zur Haftung für Inhalte, Links und die Nutzung der App finden Sie auf der Seite Haftung.',
    ],
  },
]

export const DATENSCHUTZ_SECTIONS: LegalSection[] = [
  {
    title: '1. Verantwortlicher',
    paragraphs: [
      'Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist der in unserem Impressum genannte Anbieter von LifeXP.',
      'Bei Fragen zum Datenschutz können Sie uns über die dort angegebene Kontaktadresse erreichen.',
    ],
  },
  {
    title: '2. Überblick',
    paragraphs: [
      'LifeXP ist eine persönliche Fortschritts- und Gewohnheits-App. Sie können Tageseinträge zu Bewegung, Ernährung, Wissen, Stimmung und weiteren Bereichen erfassen. Dabei entstehen personenbezogene Daten, die wir nur zum Betrieb und zur Verbesserung der App verarbeiten.',
      'LifeXP verwendet derzeit keine Benutzerkonten. Persönliche Eingaben werden überwiegend lokal im Browser bzw. in der installierten Web-App auf Ihrem Gerät gespeichert. Bei Löschung der lokalen Browserdaten können diese Daten verloren gehen.',
      'Diese Datenschutzerklärung erläutert, welche Daten verarbeitet werden, zu welchem Zweck, auf welcher Rechtsgrundlage und welche Rechte Sie haben.',
    ],
  },
  {
    title: '3. Welche Daten wir verarbeiten',
    paragraphs: ['Je nach Nutzung der App können insbesondere folgende Daten anfallen:'],
    listItems: [
      'Profildaten (z. B. Benutzername, gewähltes Ziel, Avatar-Einstellungen, Startdatum)',
      'Tages- und Fortschrittsdaten (XP, Level, Streaks, Einträge in den Bereichen Bewegung, Ernährung, Wissen, Mein Tag, Plus)',
      'Ernährungs- und Bewegungsangaben, die Sie aktiv eintragen',
      'Antworten auf Wissensfragen und Notizen in optionalen Bereichen',
      'Technische Nutzungsdaten (z. B. Zeitpunkt von Sync-Vorgängen, Fehlermeldungen bei der Kommunikation mit dem Backend)',
      'Geräte- und Browserinformationen, soweit für den Betrieb der Web-App erforderlich',
    ],
  },
  {
    title: '4. Zweck der Verarbeitung',
    paragraphs: ['Wir verarbeiten Ihre Daten, um'],
    listItems: [
      'Ihnen die App-Funktionen bereitzustellen und Ihren Fortschritt darzustellen',
      'Einträge geräteübergreifend zu synchronisieren, sofern Sie ein Profil nutzen',
      'Einstellungen, Streaks, XP und personalisierte Hinweise korrekt zu berechnen',
      'Die Stabilität, Sicherheit und Weiterentwicklung der App sicherzustellen',
      'Gesetzliche Pflichten zu erfüllen',
    ],
  },
  {
    title: '5. Rechtsgrundlagen',
    paragraphs: ['Die Verarbeitung erfolgt je nach Kontext auf folgenden Rechtsgrundlagen der DSGVO:'],
    listItems: [
      'Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung bzw. vorvertragliche Maßnahmen (Bereitstellung der App)',
      'Art. 6 Abs. 1 lit. a DSGVO — Einwilligung, soweit Sie optional zustimmen (z. B. Installation als PWA)',
      'Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse an einem sicheren, funktionsfähigen Betrieb',
    ],
  },
  {
    title: '6. Lokale Speicherung im Endgerät (TDDDG, localStorage, Cookies)',
    paragraphs: [
      'LifeXP speichert Teile Ihrer Einstellungen und Sitzungsinformationen lokal auf Ihrem Gerät, damit Sie beim erneuten Öffnen der App weiterarbeiten können. Dazu können u. a. Benutzername, Theme-Einstellung, Onboarding-Status, Wochenplan-Anker und zwischengespeicherte Profilpräferenzen gehören.',
      'Technisch notwendige Cookies bzw. vergleichbare Speichermechanismen dienen der Wiedererkennung Ihrer Sitzung und der zuverlässigen Nutzung als installierte Web-App (PWA). Diese Speicherung ist für den Betrieb erforderlich und erfolgt, soweit einschlägig, auf Grundlage von § 25 Abs. 2 Nr. 2 TDDDG (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz), weil sie technisch unbedingt erforderlich ist.',
      'Sie können lokale Daten jederzeit über die Browser-Einstellungen löschen. Beachten Sie, dass dabei auch Fortschritt und Einstellungen auf dem Gerät verloren gehen können, sofern sie nicht zusätzlich serverseitig gesichert sind.',
    ],
  },
  {
    title: '7. Server, Hosting und Supabase',
    paragraphs: [
      'Profil- und Tagesdaten werden in einer Datenbank bei Supabase gespeichert und über verschlüsselte Verbindungen (HTTPS/TLS) übertragen. Supabase kann als Auftragsverarbeiter nach Art. 28 DSGVO eingesetzt werden.',
      'Hosting- und Infrastruktur-Dienstleister verarbeiten technische Zugriffsdaten (z. B. IP-Adresse, Zeitstempel, Request-Metadaten), soweit dies für Auslieferung, Sicherheit und Fehleranalyse erforderlich ist.',
      'Eine Übermittlung in Drittländer außerhalb der EU/des EWR erfolgt nur, wenn geeignete Garantien bestehen (z. B. Standardvertragsklauseln) oder eine andere gesetzliche Grundlage vorliegt.',
    ],
  },
  {
    title: '8. Progressive Web App (PWA)',
    paragraphs: [
      'Wenn Sie LifeXP zum Startbildschirm hinzufügen, wird die App lokal zwischengespeichert (Service Worker / App-Cache), damit sie schneller startet und offline Teile der Oberfläche laden kann. Dabei werden keine zusätzlichen personenbezogenen Profile an Dritte weitergegeben.',
      'Push-Benachrichtigungen oder Standortdaten werden derzeit nicht abgefragt, sofern in der App nicht ausdrücklich anders angegeben.',
    ],
  },
  {
    title: '9. Weitergabe an Dritte',
    paragraphs: [
      'Wir verkaufen Ihre Daten nicht. Eine Weitergabe erfolgt nur, wenn dies zur Vertragserfüllung notwendig ist (z. B. an Hosting-/Datenbank-Dienstleister), wir gesetzlich dazu verpflichtet sind oder Sie eingewilligt haben.',
      'Empfänger sind vertraglich verpflichtet, Daten nur nach Weisung und unter Einhaltung des Datenschutzes zu verarbeiten.',
    ],
  },
  {
    title: '10. Speicherdauer',
    paragraphs: [
      'Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.',
      'Profil- und Tagesdaten bleiben grundsätzlich bestehen, solange Sie die App nutzen. Nach Löschung Ihres Profils bzw. auf entsprechenden Löschantrag werden Daten gelöscht oder anonymisiert, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.',
      'Über die Funktion „Profil löschen“ können alle gespeicherten Nutzerdaten dauerhaft entfernt werden.',
      'Technische Protokolldaten werden in der Regel nur kurzzeitig vorgehalten.',
    ],
  },
  {
    title: '11. Ihre Rechte',
    paragraphs: [
      'Sie haben gegenüber dem Verantwortlichen u. a. folgende Rechte:',
      'Zur Ausübung des Löschungsrechts können Sie die Funktion „Profil löschen“ in der App nutzen oder uns unter der im Impressum genannten E-Mail-Adresse kontaktieren.',
    ],
    listItems: [
      'Auskunft über die verarbeiteten Daten (Art. 15 DSGVO)',
      'Berichtigung unrichtiger Daten (Art. 16 DSGVO)',
      'Löschung (Art. 17 DSGVO), soweit keine Aufbewahrungspflichten entgegenstehen',
      'Einschränkung der Verarbeitung (Art. 18 DSGVO)',
      'Datenübertragbarkeit (Art. 20 DSGVO)',
      'Widerspruch gegen Verarbeitung auf Basis berechtigter Interessen (Art. 21 DSGVO)',
      'Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)',
    ],
  },
  {
    title: '12. Beschwerderecht',
    paragraphs: [
      'Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Ortes des mutmaßlichen Verstoßes.',
    ],
  },
  {
    title: '13. Datensicherheit',
    paragraphs: [
      'Wir treffen angemessene technische und organisatorische Maßnahmen, um Ihre Daten vor Verlust, Missbrauch und unbefugtem Zugriff zu schützen. Absolute Sicherheit kann bei internetbasierten Diensten nicht garantiert werden.',
      'Bitte schützen Sie Ihr Gerät und Ihren Browserzugang, insbesondere wenn Sie LifeXP auf einem gemeinsam genutzten Gerät nutzen.',
    ],
  },
  {
    title: '14. Minderjährige',
    paragraphs: [
      'LifeXP richtet sich nicht an Kinder unter 16 Jahren. Wenn Sie Kenntnis davon erlangen, dass Daten Minderjähriger ohne Zustimmung der Erziehungsberechtigten verarbeitet wurden, kontaktieren Sie uns — wir werden die Daten löschen, soweit gesetzlich zulässig.',
    ],
  },
  {
    title: '15. Änderungen dieser Datenschutzerklärung',
    paragraphs: [
      'Wir passen diese Erklärung an, wenn sich die App, eingesetzte Dienste oder rechtliche Anforderungen ändern. Die jeweils aktuelle Fassung ist unter /datenschutz abrufbar.',
      'Stand: Juni 2026',
    ],
  },
]

export const HAFTUNG_SECTIONS: LegalSection[] = [
  {
    title: 'Haftung für Inhalte',
    paragraphs: [
      'Als Diensteanbieter sind wir gemäß § 7 Abs. 1 des Digitale-Dienste-Gesetzes (DDG) für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Die Haftung für fremde bzw. von Nutzern bereitgestellte Informationen richtet sich nach § 7 DDG in Verbindung mit den Artikeln 4 bis 8 der Verordnung (EU) 2022/2065 über digitale Dienste (Digital Services Act, DSA). Wir sind insbesondere nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.',
      'Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.',
    ],
  },
  {
    title: 'Haftung für Links',
    paragraphs: [
      'Unser Angebot kann Links zu externen Websites Dritter enthalten, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.',
      'Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.',
    ],
  },
  {
    title: 'Keine medizinische oder therapeutische Beratung',
    paragraphs: [
      'LifeXP dient der persönlichen Dokumentation von Gewohnheiten, Fortschritt und Alltagseindrücken. Die App ersetzt keine medizinische, ernährungswissenschaftliche oder psychologische Beratung, Diagnose oder Behandlung.',
      'Entscheidungen zu Gesundheit, Training, Ernährung oder Medikamenten sollten Sie in Abstimmung mit qualifizierten Fachpersonen treffen. Für Schäden, die aus der alleinigen Nutzung der App ohne fachliche Beratung entstehen, übernehmen wir keine Haftung, soweit gesetzlich zulässig.',
    ],
  },
  {
    title: 'Verfügbarkeit und Gewährleistung der App',
    paragraphs: [
      'Wir bemühen uns um einen störungsfreien Betrieb von LifeXP. Wartung, Updates, Netzwerkprobleme oder höhere Gewalt können jedoch zu vorübergehenden Einschränkungen führen.',
      'Für den Verlust von lokal gespeicherten Daten infolge von Browser-Löschungen, Gerätewechsel oder technischen Störungen wird — soweit gesetzlich zulässig — keine Haftung übernommen, sofern kein vorsätzliches oder grob fahrlässiges Verschulden vorliegt.',
    ],
  },
  {
    title: 'Urheberrecht',
    paragraphs: [
      'Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.',
    ],
  },
  {
    title: 'Stand',
    paragraphs: ['Stand: Juni 2026'],
  },
]
