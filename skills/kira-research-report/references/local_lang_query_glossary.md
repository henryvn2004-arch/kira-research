# Local-language query glossary

Canonical translations of common KIRA research query terms into each supported local language. Used by `content_per_section.md` Stage 4 to construct dual-language WebSearch queries (EN pass + local-language pass) for richer source coverage.

## When to use

Stage 4 runs an **English query pass** (from each blueprint's `query_strategy.json`) for every report. If the report's `local_language_code` ∈ {`vi`, `id`, `th`, `ja`, `ko`}, Stage 4 ALSO runs a **local-language query pass** using the term substitutions below. Findings from both passes are deduped by source URL and merged into a single `research_data` payload.

- English-speaking primary: `local_language_code = en` → skip the local pass (Singapore default, Malaysia primary, Philippines primary).
- Hybrid markets (MY / PH): tier-2 priority — fire local pass only when EN pass yields < 6 high-quality sources per bucket. Local codes: MY → `ms`, PH → `tl`.

## Country → local_language_code mapping

| ISO | Country | Code | Pass behavior |
|---|---|---|---|
| VN | Vietnam | `vi` | Always fire local pass |
| ID | Indonesia | `id` | Always fire local pass |
| TH | Thailand | `th` | Always fire local pass |
| JP | Japan | `ja` | Always fire local pass |
| KR | Korea (South) | `ko` | Always fire local pass |
| MY | Malaysia | `ms` | Tier-2 (fire if EN sparse) |
| PH | Philippines | `tl` | Tier-2 (fire if EN sparse) |
| SG | Singapore | `en` | Skip local pass |
| HK | Hong Kong | `en` | Skip local pass (zh-HK optional tier-2) |
| TW | Taiwan | `zh-TW` | Tier-2 (fire if EN sparse) |

Topic parser emits `local_language_code` based on `country_iso`. Default `en` for unmapped or English-primary countries.

## Country name translations

Used in the `{{country}}` placeholder of localized queries.

| Code | Country in local language |
|---|---|
| `vi` | Việt Nam |
| `id` | Indonesia |
| `th` | ประเทศไทย (or "ไทย" for shorter queries) |
| `ja` | 日本 |
| `ko` | 한국 |
| `ms` | Malaysia |
| `tl` | Pilipinas |
| `zh-TW` | 台灣 |

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
