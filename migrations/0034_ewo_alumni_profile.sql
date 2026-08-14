-- EWO (Extreme Weapons Operations) alumni flag on member profiles.

ALTER TABLE member_profiles ADD COLUMN ewo_alumni INTEGER NOT NULL DEFAULT 0;
