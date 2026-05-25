-- ============================================================
-- Migration 015 — extend studio-inputs bucket to accept .pptx
--
-- Phase: Studio "re-do deck" use case (2026-05-25).
-- User asked: "why doesn't Studio accept pptx? users might want to
-- re-do their decks." Original migration 010 only whitelisted PDF/
-- DOCX/XLSX/CSV/TXT MIMEs on the bucket. The frontend + backend
-- validators have been updated to allow .pptx in the same change;
-- the bucket MIME whitelist is the third defense layer that must
-- also be updated, otherwise Supabase Storage rejects the upload
-- even though the API accepted it.
--
-- Worker (api/_lib/studio-worker.js) parses .pptx text via the new
-- `officeparser` dependency. Extracted text is fed to Claude as
-- slide-tagged context (`--- Slide N ---` headers), so the LLM
-- can re-interpret the deck content for the new report.
--
-- Note on "re-do" expectation: Studio gens from scratch using the
-- extracted text. It does NOT preserve the input deck's design,
-- layout, or slide order. The output is a KIRA-styled report (or
-- editable PPTX from Phase N.27), not an updated version of the
-- input deck.
--
-- Idempotent. Safe to re-run. Verify with the RAISE NOTICE at end.
-- ============================================================

do $$
declare
  current_mimes text[];
  pptx_mime     constant text := 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
begin
  select allowed_mime_types
    into current_mimes
    from storage.buckets
   where id = 'studio-inputs';

  if current_mimes is null then
    raise notice 'Migration 015: bucket studio-inputs not found. Run migration 010 first.';
    return;
  end if;

  if pptx_mime = any(current_mimes) then
    raise notice 'Migration 015: pptx MIME already in allowed list, no-op.';
    return;
  end if;

  update storage.buckets
     set allowed_mime_types = current_mimes || array[pptx_mime]
   where id = 'studio-inputs';

  raise notice 'Migration 015 done. studio-inputs now allows pptx (% MIMEs total).',
    array_length(current_mimes, 1) + 1;
end $$;
