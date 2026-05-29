// ============================================================
// Company Intelligence — pipeline constants
// Multi-country: VN first; JP/KR/AU/SG/MY/ID/TH/PH/NZ in later sprints.
// ============================================================

export const PIPELINE_VERSION = 1;

// Supported countries (ISO 3166-1 alpha-2). VN = fully wired Sprint 1.
// Others = schema-ready, connectors TBD per sprint.
export const SUPPORTED_COUNTRIES = ['VN', 'JP', 'KR', 'AU', 'SG', 'MY', 'ID', 'TH', 'PH', 'NZ'];
export const DEFAULT_COUNTRY = 'VN';

// Tax ID field name per country (for UI hints and API docs)
export const TAX_ID_LABEL = {
  VN: 'MST',   // Mã số thuế — 10-digit company, 13-digit branch
  JP: 'CN',    // Corporate Number (法人番号) — 13 digits
  KR: 'BRN',  // Business Registration Number (사업자등록번호) — 10 digits
  AU: 'ABN',   // Australian Business Number — 11 digits
  SG: 'UEN',   // Unique Entity Number — 9-10 chars
  MY: 'SSM',   // Companies Commission number — 12 digits
  ID: 'NIB',   // Nomor Induk Berusaha — 13 digits
  TH: 'TIN',   // Tax Identification Number — 13 digits
  PH: 'SEC',   // SEC Registration Number
  NZ: 'NZBN',  // New Zealand Business Number — 13 digits
};

// Cache TTL in days per source type (0 = no cache / realtime)
export const SOURCE_TTL_DAYS = {
  dkkd:           30,  // VN: Cổng thông tin ĐKKD
  tax:             7,  // VN: Tổng cục Thuế
  noip:           30,  // VN: NOIP trademarks
  court:          30,  // VN: court filings
  bidding:        30,  // VN: đấu thầu quốc gia
  acra:           90,  // SG: ACRA BizFile+
  asic:           90,  // AU: ASIC company search
  dart:           30,  // KR: DART (금융감독원)
  edinet:         30,  // JP: EDINET (金融庁)
  ssm:            90,  // MY: SSM e-Info
  ahu:            90,  // ID: AHU (Kementerian Hukum)
  dbd:            90,  // TH: DBD (กรมพัฒนาธุรกิจการค้า)
  sec_ph:         90,  // PH: SEC iView
  nzbn:           90,  // NZ: NZBN Register
  gmb:             7,
  shopee:          3,
  facebook:        3,
  website:         7,
  news:            0,
  foreign_filing: 90,
};

// Entity resolution confidence thresholds
export const MATCH_CONF = {
  TAX_ID_DIRECT: 1.0,  // tax_id appears directly in source
  PHONE:         0.9,  // Matching phone number
  NAME_ADDRESS:  0.75, // Matching normalised name + address
  NAME_ONLY:     0.4,  // Name only — too weak to auto-link
  AUTO_LINK_MIN: 0.75, // Must reach this to auto-link; below → skip/candidate only
};

// Graph traversal limits
export const GRAPH_MAX_DEPTH = 2;
export const GRAPH_MAX_NODES = 30;
export const GRAPH_MIN_CONF  = 0.3;  // Prune edges below this path-confidence

// Source types that all connectors must recognise
export const SOURCE_TYPES = [
  // VN
  'dkkd', 'tax', 'noip', 'court', 'bidding',
  // Other countries
  'acra', 'asic', 'dart', 'edinet', 'ssm', 'ahu', 'dbd', 'sec_ph', 'nzbn',
  // Universal
  'gmb', 'shopee', 'facebook', 'website', 'news', 'foreign_filing',
];

// Relationship types (edge labels in the entity graph)
export const REL_TYPES = [
  'owns_trademark',
  'operates_brand',
  'shares_legal_rep',
  'shares_address',
  'shareholder_of',
  'subsidiary_of',
  'branch_of',
  'legal_rep_of',
  'mentioned_with',
];
