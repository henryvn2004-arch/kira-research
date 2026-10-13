-- 055: library sector for planned topics.
-- The library's "Sector" filter groups report industry codes into 12 sectors (api/_lib/sectors.js).
-- Planned (coming-soon) topics hang off tax_industries, which had no sector, so they could not be
-- filtered next to published reports. Each level-1 industry gets one of the 12 sector keys and its
-- children inherit it. New industries added later stay NULL (they still list; they just do not match a
-- sector filter) until someone sets the sector. Idempotent.
alter table public.tax_industries add column if not exists sector text;

with m(slug, sector) as (values
  ('agriculture-agri-inputs', 'food'),
  ('packaged-food-beverages', 'food'),
  ('coffee-tea', 'food'),
  ('restaurants-f-b-chains', 'food'),
  ('baby-maternity', 'consumer'),
  ('beauty-personal-care', 'consumer'),
  ('e-commerce-marketplaces', 'consumer'),
  ('fashion-apparel-retail', 'consumer'),
  ('home-care', 'consumer'),
  ('household-appliances', 'consumer'),
  ('modern-retail-convenience-stores', 'consumer'),
  ('pet-care', 'consumer'),
  ('supermarkets-hypermarkets', 'consumer'),
  ('fintech-payments', 'finance'),
  ('insurance', 'finance'),
  ('retail-banking-consumer-finance', 'finance'),
  ('software-digital-services', 'tech'),
  ('data-centres-cloud', 'tech'),
  ('telecom-digital-infrastructure', 'tech'),
  ('diagnostics-labs', 'health'),
  ('eldercare-nursing', 'health'),
  ('hospitals-clinics', 'health'),
  ('medical-devices', 'health'),
  ('pharmaceuticals-pharmacy-chains', 'health'),
  ('commercial-real-estate-malls', 'property'),
  ('residential-property', 'property'),
  ('construction-engineering', 'property'),
  ('auto-aftermarket-service', 'auto'),
  ('ev-charging', 'auto'),
  ('motorcycles-mobility', 'auto'),
  ('passenger-vehicles-dealerships', 'auto'),
  ('logistics-cold-chain', 'logistics'),
  ('renewable-energy-utilities', 'energy'),
  ('industrial-machinery-equipment-sold-to-local-firms', 'industrial'),
  ('hospitality-tourism', 'travel'),
  ('education-training', 'services')
)
update public.tax_industries i set sector = m.sector
from m where i.slug = m.slug and i.parent_id is null;

-- Children (and grandchildren) inherit; run twice for two levels below the root.
update public.tax_industries c set sector = p.sector
from public.tax_industries p where c.parent_id = p.id and p.sector is not null and c.sector is distinct from p.sector;
update public.tax_industries c set sector = p.sector
from public.tax_industries p where c.parent_id = p.id and p.sector is not null and c.sector is distinct from p.sector;
