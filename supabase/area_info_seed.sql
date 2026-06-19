-- Infotexte für alle Info-Buttons (Tabelle area_info).
-- In Supabase SQL Editor ausführen. Voraussetzung: Tabelle area_info mit u. a.
-- area, subarea, title, content, goal_type, gender, alcohol_mode, active.
-- Wildcard-Zeilen (both) gelten für alle Profile.

INSERT INTO public.area_info (area, subarea, title, content, goal_type, gender, alcohol_mode, active)
SELECT v.area, v.subarea, v.title, v.content, 'both', 'both', 'both', true
FROM (
  VALUES
    -- Hauptbereiche (subarea leer)
    (
      'Bewegung',
      NULL,
      'Training',
      'Hier sammelst du Trainings-XP durch Schritte, Training oder Bewegung bei der Arbeit. Wähle ehrlich, was heute stattgefunden hat — regelmäßige Bewegung zählt mehr als Perfektion. Bei besonders viel Training kann der Boost-Modus zusätzliche XP bringen.'
    ),
    (
      'Ernährung',
      NULL,
      'Ernährung',
      'Trage deine Mahlzeiten ein — grob geschätzt oder genau mit Kalorien und Protein. Am Tagesende bewertest du deine Ernährung und erhältst Ernährungs-XP passend zu deinen persönlichen Zielwerten.'
    ),
    (
      'Wissen',
      NULL,
      'Wissen',
      'Jeden Tag eine kurze Frage zu Ernährung, Bewegung oder Gewohnheiten. Mit der richtigen Antwort sammelst du Wissens-XP. Die Fragen wechseln — auch wenn du einmal danebenliegst, lohnt sich das Mitmachen zum Lernen.'
    ),
    (
      'Mein Tag',
      NULL,
      'Mein Tag',
      'Ein kurzer Tages-Check: Schlaf, Befinden sowie Sonne und frische Luft. So erkennst du Muster und sammelst Mein-Tag-XP — ohne lange Formulare, nur ein ehrlicher Moment für dich.'
    ),
    (
      'Plus',
      NULL,
      'Plus',
      'Freiwillige Extras neben Ernährung, Bewegung und Wissen: Aufgaben planen, Motivation, Glaubenssatz oder Alkohol tracken. Plus-XP belohnt Bausteine, die dein persönliches Ziel unterstützen.'
    ),
    (
      'Liga',
      NULL,
      'Liga',
      'Mit Liga-XP steigst du Stufe für Stufe von unten nach oben — Richtung Elite. Du erhältst Liga-XP unter anderem durch „Bin dabei!“ auf der XP-Seite und durch gute Tagesbewertungen in den Bereichen.'
    ),
    (
      'Aufgabenplaner',
      NULL,
      'Aufgabenplaner',
      'Plane und erledige Aufgaben für heute, morgen, gestern oder ein freies Datum. Erledigte Aufgaben geben Plus-XP. Der Wochenüberblick hilft dir, Vorsätze im Blick zu behalten.'
    ),
    (
      'Was jetzt tun',
      NULL,
      'Was jetzt tun?',
      'Hier siehst du, was als Nächstes am sinnvollsten ist — abhängig von deinem Tagesstand in Ernährung, Bewegung, Wissen, Mein Tag und Plus. Die Empfehlungen sind Orientierung, kein Muss.'
    ),

    -- Bewegung — Unterseiten
    (
      'Bewegung',
      'Arbeit',
      'Bewegung bei der Arbeit',
      'Bewegung im Arbeitsalltag zählt: Stehen, Gehen, Treppen oder aktive Pausen. Wähle die Stufe, die deinem Tag am ehesten entspricht — jede ehrliche Angabe bringt Trainings-XP.'
    ),
    (
      'Bewegung',
      'Schritte',
      'Schritte',
      'Tägliche Schritte sind der einfachste Weg zu Bewegungs-XP. Gib an, ob du heute wenig, mittel oder viel unterwegs warst — ohne exakte Schrittzahl.'
    ),
    (
      'Bewegung',
      'Training',
      'Training',
      'Geplante Sporteinheiten oder intensivere Bewegung. Je nach Umfang und Intensität gibt es unterschiedlich viel XP; bei besonders viel Training kann der Boost-Modus starten.'
    ),

    -- Ernährung — Unterseiten
    (
      'Ernährung',
      'Grob schätzen',
      'Grob schätzen',
      'Schnelle Schätzung pro Mahlzeit — gut unterwegs oder wenn du keine genauen Werte hast. Am Tagesende fließt die grobe Einschätzung in deine Ernährungsbewertung ein.'
    ),
    (
      'Ernährung',
      'Genau',
      'Genau erfassen',
      'Kalorien und Protein pro Mahlzeit konkret eintragen — aus der Liste oder mit eigenen Lebensmitteln. Genauere Daten helfen bei der Tagesbewertung und deinen Zielwerten.'
    ),

    -- Mein Tag — Unterseiten
    (
      'Mein Tag',
      'Schlaf',
      'Schlaf',
      'Wie gut hast du geschlafen? Eine ehrliche Einschätzung reicht — ohne Tracker. Schlaf beeinflusst Energie, Befinden und oft auch deine Ernährung im Alltag.'
    ),
    (
      'Mein Tag',
      'Befinden',
      'Befinden',
      'Wie fühlst du dich heute? Stimmung, Stress oder Energie — ein kurzer Check-in für mehr Selbstwahrnehmung und Mein-Tag-XP.'
    ),
    (
      'Mein Tag',
      'Sonne/frische Luft',
      'Sonne & frische Luft',
      'Warst du heute draußen? Tageslicht und frische Luft unterstützen Wohlbefinden und helfen, gesunde Routinen beizubehalten.'
    ),

    -- Plus — Unterseiten
    (
      'Plus',
      'Motivation',
      'Motivation',
      'Täglicher Motivationssatz, wenn du ihn in den Zielvorgaben aktiviert hast. Ein kurzer Impuls am Tag — optional, aber hilfreich für Fokus und Routine.'
    ),
    (
      'Plus',
      'Alkohol',
      'Alkohol',
      'Trage ein, ob und wie viel du getrunken hast — nur wenn du Alkohol-Tracking in den Zielvorgaben eingeschaltet hast. Es geht um ehrliche Dokumentation, nicht um Bewertung oder Schuld.'
    ),
    (
      'Plus',
      'Glaubenssatz',
      'Glaubenssatz',
      'Ein Glaubenssatz pro Woche zum Reflektieren und Umsetzen. Er unterstützt dein Mindset neben Ernährung und Bewegung und gibt Plus-XP bei der Bearbeitung.'
    ),

    -- Aufgabenplaner — Unterseiten
    (
      'Aufgabenplaner',
      'Heute',
      'Aufgaben heute',
      'Was steht heute an? Trage Aufgaben ein und hake sie ab — erledigte Punkte geben Plus-XP. Kleine Schritte zählen.'
    ),
    (
      'Aufgabenplaner',
      'Gestern',
      'Aufgaben gestern',
      'Rückblick auf gestern: Was war geplant, was hast du geschafft? Hilft dir, Muster zu erkennen und den Plan für heute anzupassen.'
    ),
    (
      'Aufgabenplaner',
      'Morgen',
      'Aufgaben morgen',
      'Plane schon heute, was morgen ansteht. So startest du vorbereitet in den Tag und kannst Plus-XP für erledigte Aufgaben sammeln.'
    ),
    (
      'Aufgabenplaner',
      'Datum',
      'Aufgaben nach Datum',
      'Wähle ein beliebiges Datum und plane oder prüfe Aufgaben dafür — praktisch für Termine, die nicht nur heute oder morgen sind.'
    ),
    (
      'Aufgabenplaner',
      'Woche',
      'Wochenplan',
      'Überblick über deine Aufgaben in der Woche. So siehst du auf einen Blick, was ansteht, und kannst Vorsätze besser einhalten.'
    ),

    -- Zielvorgaben (eigene area-Werte)
    (
      'Alkohol',
      'Ziele',
      'Alkohol mit tracken?',
      'Optional: Wenn du gelegentlich oder öfter etwas trinkst, kann Tracking helfen, Muster zu sehen — ohne Verzicht-Versprechen. Du legst später deine persönlichen Grenzen für „wenig“ und „viel“ fest.'
    ),
    (
      'Motivation',
      'Ziele',
      'Tägliche Motivation',
      'Optional: Ein kurzer Motivationssatz pro Tag im Plus-Bereich. Viele finden das hilfreich für Fokus; du kannst es jederzeit in den Zielvorgaben wieder ausschalten.'
    )
) AS v(area, subarea, title, content)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.area_info ai
  WHERE lower(trim(ai.area)) = lower(trim(v.area))
    AND coalesce(trim(ai.subarea), '') = coalesce(trim(v.subarea), '')
    AND lower(trim(coalesce(ai.goal_type, 'both'))) = 'both'
    AND lower(trim(coalesce(ai.gender, 'both'))) = 'both'
    AND lower(trim(coalesce(ai.alcohol_mode, 'both'))) = 'both'
);
