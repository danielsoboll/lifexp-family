-- Ein xp_events-Eintrag pro user_id + event_date + category + source.
-- App-Version mit Upsert/Quiz-Merge zuerst deployen, damit Quiz-Antworten
-- aus mehreren Alt-Zeilen zusammengeführt werden, bevor Duplikate gelöscht werden.

DELETE FROM public.xp_events a
USING public.xp_events b
WHERE a.user_id = b.user_id
  AND a.event_date = b.event_date
  AND a.category = b.category
  AND a.source = b.source
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS xp_events_user_date_category_source_uidx
  ON public.xp_events (user_id, event_date, category, source);
