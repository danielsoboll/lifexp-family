export type LegalSection = {
  title: string
  paragraphs: string[]
  listItems?: string[]
}

/** Kurzhinweis vor Stripe-Checkout — digitaler Dienst, Widerruf erlischt mit Bereitstellung. */
export const LEGAL_PLUS_CHECKOUT_NOTICE =
  'PLUS ist ein digitaler Dienst und wird nach Zahlung sofort freigeschaltet. Mit Abschluss des Checkouts stimmen Sie zu, dass wir vor Ablauf der 14-tägigen Widerrufsfrist beginnen; Ihr Widerrufsrecht erlischt mit Bereitstellung (AGB § 7 und 8).'

export const LEGAL_PLUS_CHECKOUT_PREFIX =
  'Mit Fortfahren zu Stripe schließen Sie ein monatliches PLUS-Abo ab (4,99 €/Monat, jederzeit kündbar). ' +
  LEGAL_PLUS_CHECKOUT_NOTICE +
  ' Es gelten unsere'

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
    title: 'Angebot',
    paragraphs: [
      'LifeXP Family ist eine webbasierte Familien-App (Progressive Web App) zum gemeinsamen Planen und Abhaken von Quests, Sammeln von XP, Belohnungen und optionalen Zusatzfunktionen im kostenpflichtigen Tarif „LifeXP Family PLUS“.',
      'Vertragsbedingungen für die Nutzung und das PLUS-Abo finden Sie in unseren AGB — einschließlich Hinweisen zum Widerrufsrecht bei digitalen Diensten. Datenschutz und Haftung sind unter den jeweiligen Seiten abrufbar.',
    ],
  },
  {
    title: 'Zahlungsabwicklung (PLUS)',
    paragraphs: [
      'Die Bezahlung des PLUS-Abos erfolgt über den Zahlungsdienstleister Stripe (Stripe Payments Europe, Ltd.). Vertragspartner für die App-Leistung bleibt die SLC IT-Consulting GmbH; Zahlungsdaten werden im Rahmen des Checkouts von Stripe verarbeitet (siehe Datenschutzerklärung).',
    ],
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
      'Die Europäische Kommission stellt eine Plattform zur Online-Streitschbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/',
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
      'Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist der in unserem Impressum genannte Anbieter von LifeXP Family.',
      'Bei Fragen zum Datenschutz können Sie uns über die dort angegebene Kontaktadresse erreichen.',
    ],
  },
  {
    title: '2. Überblick',
    paragraphs: [
      'LifeXP Family ist eine Familien-App für Quests, XP, Belohnungen und gemeinsame Motivation. Familien legen Profile für Eltern und Kinder an, verwalten Aufgaben und — optional — nutzen kostenpflichtige PLUS-Funktionen.',
      'Personenbezogene Daten werden auf Ihrem Gerät (localStorage, Cookies) und serverseitig in einer Datenbank bei Supabase gespeichert. Zahlungsdaten für PLUS werden über Stripe verarbeitet.',
      'Diese Datenschutzerklärung erläutert, welche Daten verarbeitet werden, zu welchem Zweck, auf welcher Rechtsgrundlage und welche Rechte Sie haben.',
    ],
  },
  {
    title: '3. Welche Daten wir verarbeiten',
    paragraphs: ['Je nach Nutzung können insbesondere folgende Daten anfallen:'],
    listItems: [
      'Familiendaten (Familienname, Einladungscode, Zeitzone, Tarif/Plan, Abo-Status)',
      'Elternprofile (Anzeigename, gewählter Avatar, Rolle in der Familie, ggf. Verknüpfung zu einem Auth-Konto für Abo-Verwaltung)',
      'Kinderprofile (Anzeigename, Geburtsjahr oder Alter, Avatar, XP/Level, Notizen, Sortierung)',
      'Quests und Fortschritt (Titel, Beschreibung, XP, Kategorien, Wiederholungen, Erledigungsstände, Verlauf)',
      'Belohnungen, Einlösungen, Herausforderungen und persönliche bzw. Familienziele',
      'Bei PLUS: wiederkehrende Quests, Foto-Nachweise und Avatar-Antworten, soweit Sie diese Funktionen nutzen',
      'Sitzungsdaten (Familien-ID, Mitgliedstyp Eltern/Kind, Mitglieds-ID) in Cookie und localStorage',
      'Wiederherstellungscode beim Anlegen oder Beitritt einer Familie (zur Wiederherstellung des Zugangs auf neuen Geräten)',
      'Bei PLUS-Abschluss: Stripe-Kunden- und Abo-Kennungen, Zahlungsstatus (keine vollständigen Kartendaten bei uns)',
      'Technische Zugriffsdaten (z. B. IP-Adresse, Zeitstempel, Request-Metadaten) beim Hosting',
    ],
  },
  {
    title: '4. Zweck der Verarbeitung',
    paragraphs: ['Wir verarbeiten Daten, um'],
    listItems: [
      'LifeXP Family bereitzustellen und Familienmitgliedern den jeweiligen Zugang zu ermöglichen',
      'Quests, XP, Belohnungen, Verlauf und Familienfunktionen zu synchronisieren',
      'Einladungen, Gerätewechsel und Wiederherstellung des Familienzugangs zu unterstützen',
      'das PLUS-Abo zu verwalten, zu verlängern und den Leistungsumfang freizuschalten',
      'Stabilität, Sicherheit und Weiterentwicklung der App sicherzustellen',
      'gesetzliche Pflichten zu erfüllen (z. B. steuerliche Aufbewahrung bei Zahlungen)',
    ],
  },
  {
    title: '5. Rechtsgrundlagen',
    paragraphs: ['Die Verarbeitung erfolgt je nach Kontext auf folgenden Rechtsgrundlagen der DSGVO:'],
    listItems: [
      'Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung bzw. vorvertragliche Maßnahmen (Nutzung der App, PLUS-Abo)',
      'Art. 6 Abs. 1 lit. a DSGVO — Einwilligung, soweit Sie optional zustimmen (z. B. PWA-Installation, sofern erforderlich)',
      'Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse an sicherem Betrieb, Missbrauchsprävention und technischer Administration',
      'Art. 6 Abs. 1 lit. c DSGVO — rechtliche Verpflichtungen (z. B. Aufbewahrung von Rechnungsdaten)',
    ],
  },
  {
    title: '6. Speicherung auf Ihrem Gerät (TDDDG, localStorage, Cookies)',
    paragraphs: [
      'Damit Sie nach dem Schließen des Browsers oder nach PWA-Start wieder in Ihrer Familie eingeloggt sind, speichern wir Sitzungsinformationen lokal (localStorage) und in einem technisch notwendigen Cookie (lifexp_fs). Dazu gehören Familien-ID, Mitgliedstyp und Mitglieds-ID. Theme-Einstellungen und Onboarding-Entwürfe können ebenfalls lokal zwischengespeichert werden.',
      'Diese Speicherung ist für den Betrieb erforderlich und erfolgt auf Grundlage von § 25 Abs. 2 Nr. 2 TDDDG (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz), weil sie technisch unbedingt erforderlich ist.',
      'Sie können lokale Daten über die Browser-Einstellungen löschen. Dadurch kann der Familienzugang auf dem Gerät verloren gehen, bis Sie sich erneut anmelden oder — falls vorgesehen — Ihren Wiederherstellungscode nutzen.',
    ],
  },
  {
    title: '7. Server, Hosting und Supabase',
    paragraphs: [
      'Familien-, Quest- und Fortschrittsdaten werden in einer Datenbank bei Supabase gespeichert und über verschlüsselte Verbindungen (HTTPS/TLS) übertragen. Supabase wird als Auftragsverarbeiter nach Art. 28 DSGVO eingesetzt.',
      'Hosting- und Infrastruktur-Dienstleister verarbeiten technische Zugriffsdaten, soweit dies für Auslieferung, Sicherheit und Fehleranalyse erforderlich ist.',
      'Eine Übermittlung in Drittländer außerhalb der EU/des EWR erfolgt nur, wenn geeignete Garantien bestehen (z. B. Standardvertragsklauseln) oder eine andere gesetzliche Grundlage vorliegt. Details können sich je nach gewähltem Rechenzentrum und Subdienstleister unterscheiden; aktuelle Informationen stellen wir auf Anfrage bereit.',
    ],
  },
  {
    title: '8. Zahlungsabwicklung über Stripe (PLUS)',
    paragraphs: [
      'Für LifeXP Family PLUS nutzen wir Stripe als Zahlungsdienstleister. Beim Checkout werden Sie zu Stripe weitergeleitet. Dort geben Sie Zahlungsdaten (z. B. Karte) direkt bei Stripe ein.',
      'Wir erhalten von Stripe u. a. Kundenkennung, Abo-Status, Vertragszeiträume und Zahlungsereignisse, um PLUS freizuschalten und zu verwalten. Vollständige Kartendaten speichern wir nicht.',
      'Stripe kann Daten als eigenständiger Verantwortlicher oder Auftragsverarbeiter verarbeiten. Informationen finden Sie in der Datenschutzerklärung von Stripe: https://stripe.com/de/privacy',
    ],
  },
  {
    title: '9. Progressive Web App (PWA)',
    paragraphs: [
      'Wenn Sie LifeXP Family zum Startbildschirm hinzufügen, wird die App lokal zwischengespeichert (Service Worker / App-Cache), damit sie schneller startet und Teile der Oberfläche offline laden kann.',
      'Push-Benachrichtigungen oder Standortdaten werden derzeit nicht abgefragt, sofern in der App nicht ausdrücklich anders angegeben.',
    ],
  },
  {
    title: '10. Weitergabe an Dritte',
    paragraphs: [
      'Wir verkaufen Ihre Daten nicht. Eine Weitergabe erfolgt nur, wenn dies zur Vertragserfüllung notwendig ist (z. B. an Supabase, Hosting-Anbieter, Stripe), wir gesetzlich dazu verpflichtet sind oder Sie eingewilligt haben.',
      'Innerhalb einer Familie sind Quest-Inhalte, XP und — bei PLUS — geteilte Fotos oder Antworten für berechtigte Familienmitglieder sichtbar, die Sie bzw. andere Admins angelegt haben.',
      'Empfänger sind vertraglich verpflichtet, Daten nur nach Weisung und unter Einhaltung des Datenschutzes zu verarbeiten.',
    ],
  },
  {
    title: '11. Speicherdauer',
    paragraphs: [
      'Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.',
      'Familiendaten bleiben grundsätzlich bestehen, solange die Familie die App nutzt. Nach Löschung der Familie bzw. auf berechtigten Löschantrag werden Daten gelöscht oder anonymisiert, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.',
      'Abo- und Zahlungsbezogene Daten können wir für die Dauer gesetzlicher Aufbewahrungsfristen (z. B. steuer- und handelsrechtlich) vorhalten.',
      'Technische Protokolldaten werden in der Regel nur kurzzeitig vorgehalten.',
    ],
  },
  {
    title: '12. Ihre Rechte',
    paragraphs: [
      'Sie haben gegenüber dem Verantwortlichen u. a. folgende Rechte:',
      'Zur Ausübung Ihrer Rechte kontaktieren Sie uns unter der im Impressum genannten E-Mail-Adresse. Bitte geben Sie an, welche Familie und welches Profil betroffen ist.',
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
    title: '13. Beschwerderecht',
    paragraphs: [
      'Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Ortes des mutmaßlichen Verstoßes.',
      'Zuständige Aufsichtsbehörde in Nordrhein-Westfalen: Landesbeauftragte für Datenschutz und Informationsfreiheit NRW, https://www.ldi.nrw.de',
    ],
  },
  {
    title: '14. Datensicherheit',
    paragraphs: [
      'Wir treffen angemessene technische und organisatorische Maßnahmen, um Ihre Daten vor Verlust, Missbrauch und unbefugtem Zugriff zu schützen. Absolute Sicherheit kann bei internetbasierten Diensten nicht garantiert werden.',
      'Bewahren Sie Wiederherstellungscodes sicher auf und schützen Sie Geräte, auf denen Familienmitglieder angemeldet sind — insbesondere bei gemeinsam genutzten Tablets oder Smartphones.',
    ],
  },
  {
    title: '15. Kinder und Eltern',
    paragraphs: [
      'LifeXP Family richtet sich an Familien; Kinder nutzen die App in der Regel über ein von Eltern eingerichtetes Profil. Vertragspartner und verantwortliche Ansprechperson für datenschutzrechtliche Fragen ist die handelnde erwachsene Person (in der Regel ein Elternteil bzw. Familien-Admin).',
      'Eltern sind dafür verantwortlich, dass die Nutzung durch Kinder altersgerecht erfolgt und dass eingestellte Inhalte (z. B. Fotos, Quest-Texte) rechtlich zulässig sind.',
      'Wenn Sie Kenntnis davon erlangen, dass Daten ohne erforderliche Zustimmung der Erziehungsberechtigten verarbeitet wurden, kontaktieren Sie uns — wir werden die Daten löschen, soweit gesetzlich zulässig.',
    ],
  },
  {
    title: '16. Änderungen dieser Datenschutzerklärung',
    paragraphs: [
      'Wir passen diese Erklärung an, wenn sich die App, eingesetzte Dienste oder rechtliche Anforderungen ändern. Die jeweils aktuelle Fassung ist unter /datenschutz abrufbar.',
      'Stand: Juli 2026',
    ],
  },
]

export const HAFTUNG_SECTIONS: LegalSection[] = [
  {
    title: 'Haftung für Inhalte',
    paragraphs: [
      'Als Diensteanbieter sind wir gemäß § 7 Abs. 1 des Digitale-Dienste-Gesetzes (DDG) für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Die Haftung für fremde bzw. von Nutzern bereitgestellte Informationen richtet sich nach § 7 DDG in Verbindung mit den Artikeln 4 bis 8 der Verordnung (EU) 2022/2065 über digitale Dienste (Digital Services Act, DSA). Wir sind insbesondere nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.',
      'Quest-Texte, Fotos, Belohnungsbeschreibungen und sonstige Einträge stellen Inhalte der jeweiligen Familie bzw. Nutzer dar. Verpflichtungen zur Entfernung oder Sperrung nach den allgemeinen Gesetzen bleiben unberührt. Eine Haftung ist erst ab Kenntnis einer konkreten Rechtsverletzung möglich; bei Bekanntwerden werden wir Inhalte umgehend prüfen und ggf. entfernen.',
    ],
  },
  {
    title: 'Haftung für Links',
    paragraphs: [
      'Unser Angebot kann Links zu externen Websites Dritter enthalten (z. B. Stripe-Checkout, Stripe-Kundenportal), auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte übernehmen wir keine Gewähr. Verantwortlich ist der jeweilige Anbieter oder Betreiber.',
      'Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Eine permanente inhaltliche Kontrolle ist ohne konkrete Anhaltspunkte nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.',
    ],
  },
  {
    title: 'Keine Erziehungs-, medizinische oder therapeutische Beratung',
    paragraphs: [
      'LifeXP Family dient der spielerischen Organisation von Aufgaben, Motivation und Familienabläufen. Die App ersetzt keine Erziehungsberatung, medizinische, ernährungswissenschaftliche oder psychologische Beratung, Diagnose oder Behandlung.',
      'Entscheidungen zu Gesundheit, Erziehung, Medienkonsum oder Alltagsstruktur treffen Eltern und Erziehungsberechtigte eigenverantwortlich. Für Schäden, die aus der alleinigen Nutzung der App ohne fachliche Beratung entstehen, übernehmen wir keine Haftung, soweit gesetzlich zulässig.',
    ],
  },
  {
    title: 'Verfügbarkeit, kostenlose und kostenpflichtige Funktionen',
    paragraphs: [
      'Wir bemühen uns um einen störungsfreien Betrieb von LifeXP Family. Wartung, Updates, Netzwerkprobleme, Störungen bei Drittanbietern (z. B. Supabase, Stripe) oder höhere Gewalt können jedoch zu vorübergehenden Einschränkungen führen.',
      'Der kostenlose Funktionsumfang kann sich weiterentwickeln. PLUS-Funktionen werden schrittweise ausgebaut; ein Anspruch auf bestimmte noch angekündigte Features besteht nur im Rahmen der AGB und des jeweils gebuchten Leistungsumstands.',
      'Bei Ausfall oder eingeschränkter Verfügbarkeit besteht — außerhalb der gesetzlichen Gewährleistungsrechte — kein Anspruch auf Schadensersatz, soweit gesetzlich zulässig.',
    ],
  },
  {
    title: 'Datenverlust und Gerätewechsel',
    paragraphs: [
      'Für den Verlust von lokal gespeicherten Sitzungs- oder Einstellungsdaten infolge von Browser-Löschungen, Gerätewechsel oder technischen Störungen auf dem Endgerät wird — soweit gesetzlich zulässig — keine Haftung übernommen, sofern kein vorsätzliches oder grob fahrlässiges Versulden vorliegt.',
      'Nutzen Sie den vorgesehenen Wiederherstellungscode und sichern Sie den Familienzugang, bevor Sie Gerätedaten löschen.',
    ],
  },
  {
    title: 'Haftungsbeschränkung',
    paragraphs: [
      'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung — soweit gesetzlich zulässig — ausgeschlossen.',
      'Dies gilt entsprechend für Erfüllungsgehilfen und gesetzliche Vertreter.',
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
    paragraphs: ['Stand: Juli 2026'],
  },
]

export const AGB_SECTIONS: LegalSection[] = [
  {
    title: '1. Geltungsbereich und Anbieter',
    paragraphs: [
      'Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der webbasierten Anwendung „LifeXP Family“ (nachfolgend „App“) der SLC IT-Consulting GmbH, Wenkenstr. 67, 32105 Bad Salzuflen (nachfolgend „Anbieter“, „wir“).',
      'Abweichende Bedingungen des Nutzers gelten nicht, es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.',
      'Die App richtet sich an Verbraucher im Sinne des § 13 BGB und kann auch von nicht-verbraucherischen Nutzern verwendet werden. Bei Widersprüchen zugunsten des Verbrauchers gehen zwingende Verbraucherschutzvorschriften vor.',
    ],
  },
  {
    title: '2. Leistungsgegenstand',
    paragraphs: [
      'LifeXP Family ermöglicht Familien, Profile für Eltern und Kinder anzulegen, Quests zu planen, XP und Belohnungen zu verwalten sowie den Fortschritt gemeinsam einzusehen.',
      'Der kostenlose Tarif umfasst den jeweils freigeschalteten Basisfunktionsumfang. Der kostenpflichtige Tarif „LifeXP Family PLUS“ erweitert den Umfang um zusätzliche Funktionen (z. B. wiederkehrende Quests, Foto-Nachweise, erweiterte Automatisierungen). Der konkrete PLUS-Umfang ergibt sich aus der App-Beschreibung zum Zeitpunkt der Buchung; einzelne Funktionen können schrittweise freigeschaltet werden.',
      'Es besteht kein Anspruch auf ununterbrochene Verfügbarkeit. Wartung, Updates und Weiterentwicklung können die Nutzung vorübergehend einschränken.',
    ],
  },
  {
    title: '3. Registrierung, Familienzugang und Nutzerrollen',
    paragraphs: [
      'Zur Nutzung legt eine erwachsene Person eine Familie an oder tritt per Einladung bei. Familien-Admins verwalten Mitglieder, Einstellungen und — sofern zutreffend — das PLUS-Abo.',
      'Der Zugang erfolgt über gerätespezifische Sitzungsdaten und ggf. einen Wiederherstellungscode. Admins sind verpflichtet, Wiederherstellungscodes sicher aufzubewahren und nur vertrauenswürdigen Familienmitgliedern Zugang zu geben.',
      'Kinderprofile richten sich an Minderjährige, werden aber durch Erziehungsberechtigte eingerichtet und verantwortet. Eltern stellen sicher, dass Kinder die App altersgerecht nutzen.',
    ],
  },
  {
    title: '4. Vertragsschluss für PLUS',
    paragraphs: [
      'Die Darstellung von PLUS in der App stellt kein bindendes Angebot dar, sondern eine Einladung zur Abgabe einer Bestellung.',
      'Mit Klick auf den Checkout-Button und Abschluss des Zahlungsvorgangs bei Stripe geben Sie als Familien-Admin ein verbindliches Angebot zum Abschluss eines monatlichen PLUS-Abonnements ab. Der Vertrag kommt zustande, wenn wir die Bestellung annehmen — in der Regel durch Freischaltung von PLUS nach erfolgreicher Zahlung.',
      'PLUS ist ein digitaler Dienst ohne körperlichen Datenträger, der unmittelbar nach Vertragsschluss bereitgestellt wird. Mit Abschluss des Checkouts willigen Sie ausdrücklich ein, dass wir vor Ablauf der 14-tägigen Widerrufsfrist mit der Leistung beginnen, und bestätigen, dass Sie Ihr Widerrufsrecht mit Beginn der Bereitstellung verlieren (§ 356 Abs. 5 BGB; nähere Ausführungen in § 7 und 8).',
      'Vertragssprache ist Deutsch. Der Vertragstext (AGB, Bestellübersicht) kann in der App abgespeichert bzw. ausgedruckt werden.',
    ],
  },
  {
    title: '5. Preise und Zahlung',
    paragraphs: [
      'Der Preis für LifeXP Family PLUS beträgt derzeit 4,99 € pro Monat für die gesamte Familie. Alle Preise verstehen sich in Euro und enthalten die gesetzliche Umsatzsteuer, sofern anwendbar.',
      'Die Zahlung erfolgt monatlich im Voraus über Stripe (Kreditkarte, Debitkarte oder andere von Stripe angebotene Zahlungsarten). Ein PLUS-Abo gilt pro Familie; alle Familienmitglieder nutzen PLUS ohne Mehrpreis.',
      'Bei Zahlungsverzug oder fehlgeschlagenen Abbuchungen können wir PLUS vorübergehend sperren, bis der ausstehende Betrag beglichen ist.',
    ],
  },
  {
    title: '6. Laufzeit, Verlängerung und Kündigung',
    paragraphs: [
      'PLUS wird als monatliches Abonnement mit automatischer Verlängerung um jeweils einen Monat abgeschlossen, sofern nicht gekündigt wird.',
      'Sie können das Abo jederzeit zum Ende des laufenden Abrechnungszeitraums kündigen — über das Stripe-Kundenportal („Abo verwalten“ in den Einstellungen) oder per E-Mail an die im Impressum genannte Adresse unter Angabe der Familie.',
      'Nach Wirksamwerden der Kündigung endet PLUS mit Ablauf des bezahlten Zeitraums; es erfolgt keine anteilige Erstattung bereits gezahlter Monatsbeiträge, sofern nicht gesetzlich zwingend anders vorgeschrieben.',
      'Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.',
    ],
  },
  {
    title: '7. Widerrufsrecht für Verbraucher',
    paragraphs: [
      'Sofern Sie Verbraucher sind, steht Ihnen grundsätzlich ein Widerrufsrecht zu.',
      'Widerrufsbelehrung',
      'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.',
      'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.',
      'Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (SLC IT-Consulting GmbH, Wenkenstr. 67, 32105 Bad Salzuflen, E-Mail: d.soboll@slc-it.de) mittels einer eindeutigen Erklärung (z. B. per E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.',
      'Folgen des Widerrufs: Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart.',
    ],
    listItems: [
      'Muster-Widerrufsformular (freiwillige Nutzung): An SLC IT-Consulting GmbH, Wenkenstr. 67, 32105 Bad Salzuflen, E-Mail: d.soboll@slc-it.de — Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: LifeXP Family PLUS — Bestellt am (*)/erhalten am (*) — Name des/der Verbraucher(s) — Anschrift des/der Verbraucher(s) — Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier) — Datum — (*) Unzutreffendes streichen.',
    ],
  },
  {
    title: '8. Digitale Leistung — Erlöschen des Widerrufsrechts',
    paragraphs: [
      'LifeXP Family PLUS ist ein digitaler Dienst im Sinne des § 327 BGB, der nicht auf einem körperlichen Datenträger geliefert wird. Nach erfolgreicher Zahlung wird PLUS unverzüglich in der App freigeschaltet.',
      'Wenn Sie als Verbraucher den Checkout abschließen, verlangen Sie ausdrücklich, dass wir mit der Bereitstellung von PLUS vor Ablauf der 14-tägigen Widerrufsfrist beginnen. Sie bestätigen zugleich Ihre Kenntnis davon, dass Sie Ihr Widerrufsrecht mit Beginn der Vertragserfüllung — spätestens mit Freischaltung von PLUS — verlieren (§ 356 Abs. 5 BGB).',
      'Ein Widerruf nach Freischaltung von PLUS ist damit ausgeschlossen. Stattdessen können Sie das Abo jederzeit zum Ende des laufenden Abrechnungszeitraums kündigen (§ 6).',
      'Haben Sie — entgegen der obigen Regelung — wirksam widerrufen, bevor PLUS freigeschaltet wurde, erstatten wir bereits gezahlte Beträge. Wurde PLUS bereits bereitgestellt, erlischt das Widerrufsrecht; es bleibt nur die ordentliche Kündigung des Abonnements.',
    ],
  },
  {
    title: '9. Nutzungsrechte',
    paragraphs: [
      'Wir räumen Ihnen ein einfaches, nicht übertragbares, nicht unterlizenzierbares Recht ein, die App für private Familienzwecke im Rahmen dieser AGB zu nutzen.',
      'Reverse Engineering, automatisiertes Auslesen, Weiterverkauf oder kommerzielle Nutzung ohne unsere Zustimmung sind untersagt.',
    ],
  },
  {
    title: '10. Pflichten der Nutzer',
    paragraphs: ['Sie verpflichten sich insbesondere,'],
    listItems: [
      'keine rechtswidrigen, beleidigenden oder urheberrechtsverletzenden Inhalte (Texte, Fotos) hochzuladen oder zu verbreiten',
      'Zugangsdaten und Wiederherstellungscodes vertraulich zu behandeln',
      'keine Sicherheitsmechanismen zu umgehen und die App nicht missbräuchlich zu belasten',
      'als Erziehungsberechtigte die Nutzung durch Kinder zu beaufsichtigen und altersgerecht zu gestalten',
    ],
  },
  {
    title: '11. Gewährleistung',
    paragraphs: [
      'Es gelten die gesetzlichen Gewährleistungsrechte. Bei digitalen Diensten schulden wir die Bereitstellung der vertraglich vereinbarten Funktionen; nicht jede angekündigte künftige Funktion muss bereits zum Buchungszeitpunkt vollständig implementiert sein, sofern der Kernleistungsumfang von PLUS erkennbar beschrieben ist.',
      'Bei Mängeln kontaktieren Sie uns unter der Impressums-Adresse. Wir bemühen uns um zeitnahe Abhilfe.',
    ],
  },
  {
    title: '12. Haftung',
    paragraphs: [
      'Weitere Haftungsregelungen finden Sie auf der Seite Haftung. Im Verhältnis zu Verbrauchern gelten die zwingenden gesetzlichen Haftungsvorschriften.',
      'Für leicht fahrlässige Pflichtverletzungen haften wir nur bei Verletzung wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren, typischen Schaden. Die Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie nach dem Produkthaftungsgesetz bleibt unberührt.',
    ],
  },
  {
    title: '13. Datenschutz',
    paragraphs: [
      'Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer Datenschutzerklärung unter /datenschutz.',
    ],
  },
  {
    title: '14. Änderungen der AGB und des Leistungsumfangs',
    paragraphs: [
      'Wir können diese AGB mit Wirkung für die Zukunft anpassen, wenn hierfür sachliche Gründe bestehen (z. B. Gesetzesänderungen, neue Funktionen, Preisanpassungen). Über wesentliche Änderungen informieren wir in der App oder per E-Mail. Widersprechen Verbraucher nicht innerhalb von sechs Wochen nach Zugang der Mitteilung, gelten die geänderten AGB als angenommen; hierauf weisen wir in der Mitteilung gesondert hin.',
      'Preiserhöhungen für laufende PLUS-Abos teilen wir rechtzeitig mit; Sie können in diesem Fall zum Zeitpunkt des Inkrafttretens kündigen.',
    ],
  },
  {
    title: '15. Schlussbestimmungen',
    paragraphs: [
      'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern mit gewöhnlichem Aufenthalt in der EU bleiben zwingende Verbraucherschutzvorschriften des Aufenthaltsstaats unberührt.',
      'Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand für alle Streitigkeiten Bad Salzuflen, sofern gesetzlich zulässig.',
      'Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Regelungen unberührt.',
      'Stand: Juli 2026',
    ],
  },
]
