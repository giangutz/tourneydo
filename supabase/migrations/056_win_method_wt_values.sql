-- Add the full WT win-method set to the win_method enum (additive).
--
-- Existing values (SCORE/KO/TKO/DQ/WITHDRAWAL/FORFEIT) are kept for back-compat
-- with matches recorded before the WT extension. New matches use the WT codes:
--   PTF — final score        PTG — point gap        GDP — golden point
--   SUP — superiority        RSC — referee stops    WDR — withdrawal
--   DSQ — disqualification   PUN — punitive declaration
--
-- ADD VALUE must run in its own migration (a new enum value cannot be used in
-- the same transaction that adds it). No function changes are needed:
-- advance_match_winner already accepts a `win_method` parameter.

ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'PTF';
ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'PTG';
ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'GDP';
ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'SUP';
ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'RSC';
ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'WDR';
ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'DSQ';
ALTER TYPE win_method ADD VALUE IF NOT EXISTS 'PUN';
