ALTER TABLE incidents ADD COLUMN state_code VARCHAR(10);
ALTER TABLE incidents ADD COLUMN district VARCHAR(120);
ALTER TABLE incidents ADD COLUMN data_source VARCHAR(40) NOT NULL DEFAULT 'CITIZEN_REPORT';
UPDATE incidents SET state_code='TN' WHERE LOWER(location) LIKE '%chennai%';
UPDATE incidents SET data_source='DEMO' WHERE description LIKE 'FICTIONAL DEMONSTRATION:%';
UPDATE incidents SET data_source='QA_TEST' WHERE title LIKE 'QA DEMO:%';
ALTER TABLE incident_status_history ALTER COLUMN note TYPE VARCHAR(2400);
CREATE INDEX incidents_state_idx ON incidents(state_code);
