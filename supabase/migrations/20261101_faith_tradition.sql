-- Optional, private-by-default freeform field. See design doc "Faith
-- integration": picking "Faith & Spirituality" as an interest unlocks
-- tradition-neutral content by default; this field lets someone get
-- tradition-specific content only if they say so themselves.
alter table profiles add column faith_tradition text;
