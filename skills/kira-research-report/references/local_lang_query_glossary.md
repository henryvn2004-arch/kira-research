# Local-language query glossary

Canonical translations of common KIRA research query terms into 5 priority languages. Used by Stage 4 to construct local-language WebSearch queries alongside the EN baseline pass.

## Phase M.4 — curated vs LLM-inline split

Topic parser (`prompts/topic_parser.md`) **infers** the local language from the country using LLM reasoning. It emits:
- `local_language_code` — any ISO 639-1 / BCP-47 code (not constrained to a fixed list)
- `local_language_name` — full English name
- `use_curated_glossary: true | false`

This glossary's 24-term × 5-language tables (vi/id/th/ja/ko) are the **curated set**. When `use_curated_glossary: true`, Stage 4 substitutes terms from these tables — high quality, KIRA-vetted translations.

When `use_curated_glossary: false` (any other language — `pt`, `de`, `fr`, `ar`, `es`, `hi`, etc.), Stage 4 subagent translates query terms **inline** using LLM knowledge. Lower precision than curated, but covers any language without code changes.

## When Stage 4 fires the local pass

Decision tree:
1. `local_search_priority == "skip"` (English-dominant markets: SG, HK, IN, default for unmapped) → EN-only, no local pass
2. `local_search_priority == "tier-1"` (KIRA strategic: VN, ID, TH, JP, KR) → fire ~8-10 curated-glossary local queries alongside EN baseline
3. `local_search_priority == "tier-2"` (everything else with meaningful local press) → fire ~4-6 local queries only when EN baseline returns < 6 high-quality sources per HIGH-priority bucket. Translation: inline if `use_curated_glossary: false`, curated if true.

Multi-lingual countries: if `local_language_secondary_code` is set (e.g. Switzerland: primary `de`, secondary `fr`), fire queries in BOTH local languages. Same priority tier applies.

## Tier override table (M.4)

The **only** static lookup. Captures KIRA's business priority — which languages are strategic markets, which have curated glossaries below. Topic parser uses this AFTER inferring the language from the country.

| `local_language_code` | `local_search_priority` | `use_curated_glossary` | Note |
|---|---|---|---|
| `vi` | tier-1 | true | KIRA strategic SEA market |
| `id` | tier-1 | true | KIRA strategic SEA market |
| `th` | tier-1 | true | KIRA strategic SEA market |
| `ja` | tier-1 | true | KIRA Phase 8 expansion market |
| `ko` | tier-1 | true | KIRA Phase 9 expansion market |
| `ms` | tier-2 | false | MY business press bilingual EN+MS |
| `tl` | tier-2 | false | PH EN-dominant; TL niche |
| `zh-TW` | tier-2 | false | Taiwan |
| `en` | skip | false | English-dominant business markets — EN baseline covers |
| *(any other ISO 639-1 / BCP-47)* | tier-2 default | false | LLM-inline translation; topic_parser surfaces in `parse_notes` |

To add a new strategic market: add a row here + add a column in the term-glossary tables below. No other file changes needed (topic_parser already infers any language).

## Country name translations (curated set — 5 priority languages)

Used in the `{{country}}` placeholder of localized queries when `use_curated_glossary: true`. For LLM-inline languages, subagent translates the country name on the fly using LLM knowledge — no need to enumerate here.

| Code | Country in local language |
|---|---|
| `vi` | Việt Nam |
| `id` | Indonesia |
| `th` | ประเทศไทย (or "ไทย" for shorter queries) |
| `ja` | 日本 |
| `ko` | 한국 |

**For non-curated languages**, subagent inline-translates. Examples it should handle:
- `pt` (Brazil) → "Brasil"
- `de` (Switzerland) → "Schweiz"
- `fr` (Switzerland / France / Belgium) → "Suisse" / "France" / "Belgique"
- `ar` (Egypt) → "مصر"
- `es` (Mexico) → "México"
- `hi` (India) → "भारत"
- `nl` (Belgium / Netherlands) → "België" / "Nederland"

If subagent is unsure of the country name translation, keeping the English country name in the local-lang query is acceptable (search engines tolerate code-switching: `"Brasil EV market" or "Brazil veículos elétricos"` both work).

## Term glossary (top 24 query terms)

These are the most frequent terms in the 7 blueprints' `query_strategy.json` files. The mapping is for *query construction only* — final report copy stays English (with English source aliases per Phase L.3).

| English | vi (Vietnamese) | id (Indonesian) | th (Thai) | ja (Japanese) | ko (Korean) |
|---|---|---|---|---|---|
| market size | quy mô thị trường | ukuran pasar | ขนาดตลาด | 市場規模 | 시장 규모 |
| market growth | tăng trưởng thị trường | pertumbuhan pasar | การเติบโตของตลาด | 市場成長 | 시장 성장 |
| CAGR | CAGR (giữ nguyên) | CAGR (giữ nguyên) | CAGR (giữ nguyên) | CAGR / 年平均成長率 | CAGR / 연평균 성장률 |
| forecast | dự báo | proyeksi / prakiraan | คาดการณ์ | 予測 | 예측 |
| competitor / player | đối thủ / nhà sản xuất chính | pesaing / pemain utama | คู่แข่ง / ผู้เล่นหลัก | 競合 / 主要企業 | 경쟁사 / 주요 기업 |
| market share | thị phần | pangsa pasar | ส่วนแบ่งตลาด | 市場シェア | 시장 점유율 |
| regulation / policy | quy định / chính sách | regulasi / kebijakan | กฎระเบียบ / นโยบาย | 規制 / 政策 | 규제 / 정책 |
| distribution channel | kênh phân phối | saluran distribusi | ช่องทางการจัดจำหน่าย | 流通チャネル | 유통 채널 |
| demand | nhu cầu | permintaan | ความต้องการ / อุปสงค์ | 需要 | 수요 |
| consumption | tiêu thụ / tiêu dùng | konsumsi | การบริโภค | 消費 | 소비 |
| urbanization | đô thị hóa | urbanisasi | การพัฒนาเมือง | 都市化 | 도시화 |
| inflation | lạm phát | inflasi | เงินเฟ้อ | インフレ | 인플레이션 |
| GDP | GDP (giữ nguyên) | PDB (or GDP) | GDP / ผลิตภัณฑ์มวลรวม | GDP / 国内総生産 | GDP / 국내총생산 |
| export | xuất khẩu | ekspor | การส่งออก | 輸出 | 수출 |
| import | nhập khẩu | impor | การนำเข้า | 輸入 | 수입 |
| M&A / consolidation | M&A / sáp nhập | merger akuisisi | ควบรวมกิจการ | M&A / 統合 | M&A / 합병 인수 |
| segment | phân khúc | segmen | ส่วนตลาด | セグメント | 세그먼트 |
| pricing | giá / định giá | harga / penetapan harga | ราคา / การตั้งราคา | 価格 / 価格設定 | 가격 / 가격 책정 |
| supply chain | chuỗi cung ứng | rantai pasok | ห่วงโซ่อุปทาน | サプライチェーン | 공급망 |
| value chain | chuỗi giá trị | rantai nilai | ห่วงโซ่คุณค่า | バリューチェーン | 가치 사슬 |
| consumer | người tiêu dùng | konsumen | ผู้บริโภค | 消費者 | 소비자 |
| e-commerce | thương mại điện tử | e-commerce / niaga elektronik | อีคอมเมิร์ซ | EC / 電子商取引 | 이커머스 / 전자상거래 |
| modern trade | kênh hiện đại | gerai modern / modern trade | ค้าปลีกสมัยใหม่ | 近代小売 / モダントレード | 현대유통 / 모던트레이드 |
| trade association | hiệp hội ngành | asosiasi industri | สมาคมการค้า | 業界団体 | 협회 / 산업협회 |
| annual report | báo cáo thường niên | laporan tahunan | รายงานประจำปี | 年次報告書 | 연차 보고서 |
| statistics bureau | tổng cục thống kê | badan pusat statistik | สำนักงานสถิติแห่งชาติ | 統計局 / 総務省統計局 | 통계청 |

## Country-specific stats-bureau acronyms (already in query templates)

These are loaded from each blueprint's `query_strategy.json` `template_variable_resolution.{{country_stats_bureau}}` block. They stay as acronyms in BOTH English and local-language queries — they're the authoritative search terms (`BPS` will return more in Indonesian sources than the full name).

| Country | Acronym | Full local name |
|---|---|---|
| VN | GSO | Tổng cục Thống kê |
| ID | BPS | Badan Pusat Statistik |
| TH | NSO | สำนักงานสถิติแห่งชาติ |
| JP | 統計局 / e-Stat | 総務省統計局 |
| KR | KOSIS / 통계청 | 통계청 |
| MY | DOSM | Department of Statistics Malaysia |
| PH | PSA | Philippine Statistics Authority |
| SG | SingStat | Department of Statistics Singapore |
| TW | DGBAS | 行政院主計總處 |
| HK | C&SD | Census and Statistics Department |

## Localized query construction pattern

Given an English query template from `query_strategy.json`, e.g.:
```
"{{country}} {{industry}} market size {{year}} USD"
```

Resolution for VN coffee 2026:
- EN pass (existing): `"Vietnam coffee market size 2026 USD"`
- VI pass (new): `"Việt Nam cà phê quy mô thị trường 2026"`
  - Country: `Vietnam` → `Việt Nam`
  - Industry: `coffee` → `cà phê` (subagent translates inline; for esoteric industries that don't translate cleanly, keep the English term, e.g. `"Việt Nam fintech quy mô thị trường 2026"`)
  - `market size` → `quy mô thị trường`
  - `USD` typically dropped from local query (most local stats use VND/IDR/THB/JPY/KRW; the subagent should also fire a parallel query with the local currency unit, e.g. `"... 2026 tỷ VND"` for VN, `"... 2026 億円"` for JP)

Skip the `USD` substitution clause when local query is more idiomatic without it. Industry translation can be done inline by the subagent using LLM knowledge — no need to enumerate every industry in this glossary.

## Source quality gating (unchanged from L.3)

Both EN + local passes feed the same `result_filtering` rules in `query_execution_rules`:
- Discard results from named-firm aggregators (Mordor, Frost, Euromonitor, IMARC, etc.) — anti-positioning rule
- Prefer results with citeable methodology disclosure
- If a number appears in 3+ independent sources within ±10% (regardless of source language), treat as well-anchored secondary

A local-language source becomes the `[<alias> <year>]` per L.3 source-tag rules. Alias stays English (e.g. `[GSO 2024]` for a Vietnamese GSO source, NOT `[Tổng cục Thống kê 2024]`). The full citation in the page-bottom SOURCE KEY can include the original local-language source name for traceability:

```
SOURCE KEY · GSO 2024 = Tổng cục Thống kê Việt Nam — Niên giám Thống kê Cà phê 2024
```

## Cost note

Dual-language search ~1.5-2x the WebSearch quota per report (8-10 extra queries on top of the ~25 EN baseline, since not every bucket needs a local pass — `01_macro` and `02_sector_overview` benefit most; `05_ai_impact` rarely has local-language coverage so EN-only is fine).

## When to skip local pass per bucket

| Bucket | Local pass priority |
|---|---|
| `01_macro` | HIGH — local stats bureaus dominate GDP/inflation/policy coverage |
| `02_sector_overview` | HIGH — local industry associations + trade press have richer segment data |
| `03_competitive` | MEDIUM — listed-co filings often have local-language ARs (e.g. Vinacafe Báo cáo thường niên) |
| `04_demand_channels_regulatory` | HIGH — regulation is published in local language first |
| `05_ai_impact` | LOW — AI coverage tends to be English-first |
| `06_forecast_outlook` | MEDIUM — central bank outlooks often in both languages |

Subagent can use this priority hint to budget the ~10 local queries across buckets.
