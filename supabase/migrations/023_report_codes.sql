-- 023_report_codes.sql — report naming convention (skills/kira-research-report/docs/naming_convention.md)
-- Adds the searchable naming fields to living_reports, normalises ISO country values
-- to English names, and gives every existing report a code (stage XPL, type D).
-- Idempotent: columns IF NOT EXISTS, backfill only touches rows with code IS NULL.

ALTER TABLE living_reports
  ADD COLUMN IF NOT EXISTS code          text,
  ADD COLUMN IF NOT EXISTS industry_code text,
  ADD COLUMN IF NOT EXISTS stage         text,
  ADD COLUMN IF NOT EXISTS report_type   text,
  ADD COLUMN IF NOT EXISTS segment       text,
  ADD COLUMN IF NOT EXISTS keywords      text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'living_reports_stage_check') THEN
    ALTER TABLE living_reports ADD CONSTRAINT living_reports_stage_check CHECK (stage IS NULL OR stage IN ('XPL','ENT','XPN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'living_reports_report_type_check') THEN
    ALTER TABLE living_reports ADD CONSTRAINT living_reports_report_type_check CHECK (report_type IS NULL OR report_type IN ('D','S'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS living_reports_code_key ON living_reports (code);
CREATE INDEX IF NOT EXISTS living_reports_code_prefix_idx ON living_reports (code text_pattern_ops);
CREATE INDEX IF NOT EXISTS living_reports_keywords_idx ON living_reports USING gin (keywords);

-- Vocabulary snapshot (references/naming_vocab.json at the time of writing).
DROP TABLE IF EXISTS _cc;
CREATE TEMP TABLE _cc (name text, iso text);
INSERT INTO _cc VALUES
  ($n$Vietnam$n$, $n$VN$n$),
  ($n$Thailand$n$, $n$TH$n$),
  ($n$Indonesia$n$, $n$ID$n$),
  ($n$Malaysia$n$, $n$MY$n$),
  ($n$Singapore$n$, $n$SG$n$),
  ($n$Philippines$n$, $n$PH$n$),
  ($n$Cambodia$n$, $n$KH$n$),
  ($n$Laos$n$, $n$LA$n$),
  ($n$Myanmar$n$, $n$MM$n$),
  ($n$Brunei$n$, $n$BN$n$),
  ($n$Timor-Leste$n$, $n$TL$n$),
  ($n$Australia$n$, $n$AU$n$),
  ($n$New Zealand$n$, $n$NZ$n$),
  ($n$Taiwan$n$, $n$TW$n$),
  ($n$Japan$n$, $n$JP$n$),
  ($n$South Korea$n$, $n$KR$n$),
  ($n$Korea$n$, $n$KR$n$);
DROP TABLE IF EXISTS _ind;
CREATE TEMP TABLE _ind (alias text, code text, label text);
INSERT INTO _ind VALUES
  ($n$Agriculture & agribusiness$n$, $n$AGR$n$, $n$Agriculture & agribusiness$n$),
  ($n$Agribusiness$n$, $n$AGR$n$, $n$Agriculture & agribusiness$n$),
  ($n$AgTech$n$, $n$AGR$n$, $n$Agriculture & agribusiness$n$),
  ($n$Rice$n$, $n$AGR$n$, $n$Agriculture & agribusiness$n$),
  ($n$Rubber$n$, $n$AGR$n$, $n$Agriculture & agribusiness$n$),
  ($n$Palm Oil$n$, $n$AGR$n$, $n$Agriculture & agribusiness$n$),
  ($n$Aquaculture$n$, $n$AGR$n$, $n$Agriculture & agribusiness$n$),
  ($n$Food & beverage$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Coffee$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Bakery$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Dairy$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Snack Foods$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Food Manufacturing$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Halal Food$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Sake$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Wine$n$, $n$FNB$n$, $n$Food & beverage$n$),
  ($n$Food service$n$, $n$FSV$n$, $n$Food service$n$),
  ($n$Quick Service Restaurants$n$, $n$FSV$n$, $n$Food service$n$),
  ($n$QSR$n$, $n$FSV$n$, $n$Food service$n$),
  ($n$Coffee Chains$n$, $n$FSV$n$, $n$Food service$n$),
  ($n$Cafe Chains$n$, $n$FSV$n$, $n$Food service$n$),
  ($n$Restaurants$n$, $n$FSV$n$, $n$Food service$n$),
  ($n$Consumer goods$n$, $n$CPG$n$, $n$Consumer goods$n$),
  ($n$FMCG$n$, $n$CPG$n$, $n$Consumer goods$n$),
  ($n$Tobacco$n$, $n$CPG$n$, $n$Consumer goods$n$),
  ($n$Consumer Goods$n$, $n$CPG$n$, $n$Consumer goods$n$),
  ($n$Beauty & personal care$n$, $n$BTY$n$, $n$Beauty & personal care$n$),
  ($n$Beauty$n$, $n$BTY$n$, $n$Beauty & personal care$n$),
  ($n$Beauty & Personal Care$n$, $n$BTY$n$, $n$Beauty & personal care$n$),
  ($n$Cosmetics$n$, $n$BTY$n$, $n$Beauty & personal care$n$),
  ($n$Halal Beauty$n$, $n$BTY$n$, $n$Beauty & personal care$n$),
  ($n$Retail$n$, $n$RTL$n$, $n$Retail$n$),
  ($n$Retail$n$, $n$RTL$n$, $n$Retail$n$),
  ($n$Convenience Stores$n$, $n$RTL$n$, $n$Retail$n$),
  ($n$Modern Trade$n$, $n$RTL$n$, $n$Retail$n$),
  ($n$E-commerce$n$, $n$ECM$n$, $n$E-commerce$n$),
  ($n$E-commerce$n$, $n$ECM$n$, $n$E-commerce$n$),
  ($n$Quick Commerce$n$, $n$ECM$n$, $n$E-commerce$n$),
  ($n$Healthcare$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Healthcare$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Hospitals$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Telemedicine$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Medical Tourism$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Wellness$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Biomedical$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Cannabis$n$, $n$HLT$n$, $n$Healthcare$n$),
  ($n$Pharmaceuticals$n$, $n$PHA$n$, $n$Pharmaceuticals$n$),
  ($n$Pharma$n$, $n$PHA$n$, $n$Pharmaceuticals$n$),
  ($n$Pharmaceuticals$n$, $n$PHA$n$, $n$Pharmaceuticals$n$),
  ($n$Medical devices$n$, $n$MDV$n$, $n$Medical devices$n$),
  ($n$Medical Devices$n$, $n$MDV$n$, $n$Medical devices$n$),
  ($n$Eldercare & childcare$n$, $n$CAR$n$, $n$Eldercare & childcare$n$),
  ($n$Eldercare$n$, $n$CAR$n$, $n$Eldercare & childcare$n$),
  ($n$Aged Care$n$, $n$CAR$n$, $n$Eldercare & childcare$n$),
  ($n$Aging Care$n$, $n$CAR$n$, $n$Eldercare & childcare$n$),
  ($n$Childcare$n$, $n$CAR$n$, $n$Eldercare & childcare$n$),
  ($n$Education$n$, $n$EDU$n$, $n$Education$n$),
  ($n$Education$n$, $n$EDU$n$, $n$Education$n$),
  ($n$Edtech$n$, $n$EDU$n$, $n$Education$n$),
  ($n$Banking$n$, $n$BNK$n$, $n$Banking$n$),
  ($n$Banking$n$, $n$BNK$n$, $n$Banking$n$),
  ($n$Digital Banking$n$, $n$BNK$n$, $n$Banking$n$),
  ($n$Islamic Banking$n$, $n$BNK$n$, $n$Banking$n$),
  ($n$Fintech & payments$n$, $n$FIN$n$, $n$Fintech & payments$n$),
  ($n$Fintech$n$, $n$FIN$n$, $n$Fintech & payments$n$),
  ($n$Fintech Payments$n$, $n$FIN$n$, $n$Fintech & payments$n$),
  ($n$Cross-border Payments$n$, $n$FIN$n$, $n$Fintech & payments$n$),
  ($n$Digital Assets$n$, $n$FIN$n$, $n$Fintech & payments$n$),
  ($n$Insurance$n$, $n$INS$n$, $n$Insurance$n$),
  ($n$Insurance$n$, $n$INS$n$, $n$Insurance$n$),
  ($n$Wealth management$n$, $n$WLT$n$, $n$Wealth management$n$),
  ($n$Wealth Management$n$, $n$WLT$n$, $n$Wealth management$n$),
  ($n$Family Office$n$, $n$WLT$n$, $n$Wealth management$n$),
  ($n$Private capital & M&A$n$, $n$CAP$n$, $n$Private capital & M&A$n$),
  ($n$Private Equity$n$, $n$CAP$n$, $n$Private capital & M&A$n$),
  ($n$Private Credit$n$, $n$CAP$n$, $n$Private capital & M&A$n$),
  ($n$M&A$n$, $n$CAP$n$, $n$Private capital & M&A$n$),
  ($n$Green Finance$n$, $n$CAP$n$, $n$Private capital & M&A$n$),
  ($n$Real estate$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$Real Estate$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$Property$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$Property Development$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$Condominium$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$REITs$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$PropTech$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$Coworking$n$, $n$RES$n$, $n$Real estate$n$),
  ($n$Construction & materials$n$, $n$CON$n$, $n$Construction & materials$n$),
  ($n$Construction$n$, $n$CON$n$, $n$Construction & materials$n$),
  ($n$Cement$n$, $n$CON$n$, $n$Construction & materials$n$),
  ($n$Logistics$n$, $n$LOG$n$, $n$Logistics$n$),
  ($n$Logistics$n$, $n$LOG$n$, $n$Logistics$n$),
  ($n$Cold Chain$n$, $n$LOG$n$, $n$Logistics$n$),
  ($n$Automotive & mobility$n$, $n$AUT$n$, $n$Automotive & mobility$n$),
  ($n$Automotive$n$, $n$AUT$n$, $n$Automotive & mobility$n$),
  ($n$Automotive Parts$n$, $n$AUT$n$, $n$Automotive & mobility$n$),
  ($n$EV$n$, $n$AUT$n$, $n$Automotive & mobility$n$),
  ($n$Aviation$n$, $n$AVI$n$, $n$Aviation$n$),
  ($n$Aviation$n$, $n$AVI$n$, $n$Aviation$n$),
  ($n$Aviation MRO$n$, $n$AVI$n$, $n$Aviation$n$),
  ($n$Energy$n$, $n$ENR$n$, $n$Energy$n$),
  ($n$Renewable Energy$n$, $n$ENR$n$, $n$Energy$n$),
  ($n$Solar$n$, $n$ENR$n$, $n$Energy$n$),
  ($n$Hydrogen$n$, $n$ENR$n$, $n$Energy$n$),
  ($n$LNG$n$, $n$ENR$n$, $n$Energy$n$),
  ($n$Coal$n$, $n$ENR$n$, $n$Energy$n$),
  ($n$Mining & minerals$n$, $n$MIN$n$, $n$Mining & minerals$n$),
  ($n$Mining$n$, $n$MIN$n$, $n$Mining & minerals$n$),
  ($n$Mining Services$n$, $n$MIN$n$, $n$Mining & minerals$n$),
  ($n$Iron Ore$n$, $n$MIN$n$, $n$Mining & minerals$n$),
  ($n$Nickel$n$, $n$MIN$n$, $n$Mining & minerals$n$),
  ($n$Nickel-Battery$n$, $n$MIN$n$, $n$Mining & minerals$n$),
  ($n$Critical Minerals$n$, $n$MIN$n$, $n$Mining & minerals$n$),
  ($n$Chemicals$n$, $n$CHM$n$, $n$Chemicals$n$),
  ($n$Petrochemicals$n$, $n$CHM$n$, $n$Chemicals$n$),
  ($n$Chemicals$n$, $n$CHM$n$, $n$Chemicals$n$),
  ($n$Industrial manufacturing$n$, $n$MFG$n$, $n$Industrial manufacturing$n$),
  ($n$Manufacturing$n$, $n$MFG$n$, $n$Industrial manufacturing$n$),
  ($n$Robotics$n$, $n$MFG$n$, $n$Industrial manufacturing$n$),
  ($n$Shipbuilding$n$, $n$MFG$n$, $n$Industrial manufacturing$n$),
  ($n$Textile$n$, $n$MFG$n$, $n$Industrial manufacturing$n$),
  ($n$Apparel$n$, $n$MFG$n$, $n$Industrial manufacturing$n$),
  ($n$Defense$n$, $n$MFG$n$, $n$Industrial manufacturing$n$),
  ($n$Semiconductors$n$, $n$SEM$n$, $n$Semiconductors$n$),
  ($n$Semiconductor HBM$n$, $n$SEM$n$, $n$Semiconductors$n$),
  ($n$Semiconductor Equipment$n$, $n$SEM$n$, $n$Semiconductors$n$),
  ($n$Semiconductors$n$, $n$SEM$n$, $n$Semiconductors$n$),
  ($n$Data centers & cloud$n$, $n$DCT$n$, $n$Data centers & cloud$n$),
  ($n$Data Center$n$, $n$DCT$n$, $n$Data centers & cloud$n$),
  ($n$Data Centers$n$, $n$DCT$n$, $n$Data centers & cloud$n$),
  ($n$Cloud Infrastructure$n$, $n$DCT$n$, $n$Data centers & cloud$n$),
  ($n$Software & IT services$n$, $n$SFT$n$, $n$Software & IT services$n$),
  ($n$SaaS$n$, $n$SFT$n$, $n$Software & IT services$n$),
  ($n$Cybersecurity$n$, $n$SFT$n$, $n$Software & IT services$n$),
  ($n$AI Services$n$, $n$SFT$n$, $n$Software & IT services$n$),
  ($n$Business Process Outsourcing$n$, $n$SFT$n$, $n$Software & IT services$n$),
  ($n$BPO$n$, $n$SFT$n$, $n$Software & IT services$n$),
  ($n$Media & entertainment$n$, $n$MED$n$, $n$Media & entertainment$n$),
  ($n$Anime IP$n$, $n$MED$n$, $n$Media & entertainment$n$),
  ($n$K-Content$n$, $n$MED$n$, $n$Media & entertainment$n$),
  ($n$Streaming$n$, $n$MED$n$, $n$Media & entertainment$n$),
  ($n$Gaming$n$, $n$MED$n$, $n$Media & entertainment$n$),
  ($n$Mobile Gaming$n$, $n$MED$n$, $n$Media & entertainment$n$),
  ($n$Tourism & hospitality$n$, $n$TRV$n$, $n$Tourism & hospitality$n$),
  ($n$Tourism$n$, $n$TRV$n$, $n$Tourism & hospitality$n$),
  ($n$Hotels$n$, $n$TRV$n$, $n$Tourism & hospitality$n$),
  ($n$Professional services$n$, $n$PRO$n$, $n$Professional services$n$),
  ($n$Legal Services$n$, $n$PRO$n$, $n$Professional services$n$),
  ($n$Consulting$n$, $n$PRO$n$, $n$Professional services$n$);

-- 1. ISO country values (JP, KR, VN, SG, PH) -> English names, so country filters see them.
UPDATE living_reports lr SET country = c.name
FROM _cc c WHERE lr.country = c.iso AND c.name <> 'Korea';

-- 2. Backfill codes: CC-IND-XPL-DYY-NN, numbered by publication date within each prefix.
WITH base AS (
  SELECT lr.id, c.iso, i.code AS ic, i.label, lr.year, lr.country, lr.industry,
         c.iso || '-' || i.code || '-XPL-D' || right(lr.year::text, 2) AS prefix,
         coalesce(lr.published_at, lr.created_at) AS t,
         CASE WHEN lr.industry ~ '[a-z&][A-Z]|[A-Z]{2}' THEN lr.industry ELSE lower(lr.industry) END AS seg
  FROM living_reports lr
  JOIN _cc c  ON lower(c.name) = lower(lr.country) AND c.name <> 'Korea'
  JOIN (SELECT DISTINCT lower(alias) AS a, code, label FROM _ind) i ON i.a = lower(lr.industry)
  WHERE lr.code IS NULL
), numbered AS (
  SELECT b.*, row_number() OVER (PARTITION BY prefix ORDER BY t) +
         coalesce((SELECT max(right(x.code, 2)::int) FROM living_reports x WHERE x.code LIKE b.prefix || '-%'), 0) AS n
  FROM base b
)
UPDATE living_reports lr SET
  code          = n.prefix || '-' || lpad(n.n::text, 2, '0'),
  industry_code = n.ic,
  stage         = 'XPL',
  report_type   = 'D',
  segment       = n.seg,
  keywords      = ARRAY[n.country || ' ' || n.seg, n.seg, n.country, n.label]
FROM numbered n WHERE lr.id = n.id;

DO $$ DECLARE missing int; BEGIN
  SELECT count(*) INTO missing FROM living_reports WHERE code IS NULL;
  RAISE NOTICE 'living_reports without a code: % (add their industry/country to naming_vocab.json)', missing;
END $$;

DROP TABLE IF EXISTS _cc;
DROP TABLE IF EXISTS _ind;
