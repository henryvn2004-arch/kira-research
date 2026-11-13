-- 054_transcript_thumb.sql — listing thumbnail for each expert transcript
-- The daily runner (kira-pipeline) generates one warm-toned "analyst + local expert" illustration per
-- transcript, stores it in the public `covers` bucket under experts/<slug>.jpg and writes the URL here.
-- Additive and null-safe: the listing falls back to the initials tile when thumb_url is null.
alter table expert_transcripts add column if not exists thumb_url text;
