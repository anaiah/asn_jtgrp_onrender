/*timekeep*/
create table besi_timekeep_slu like besi_timekeep_nelu;
/* users */
create table besi_users_slu like besi_users_nelu;
/* employeess main */
create table besi_employees_slu like besi_employees_nelu;
/*series*/
create table besi_slu_series like besi_nelu_series;

INSERT INTO `besi_slu_series` (`series_data`) 
VALUES ('[{"code":"01","series":0},{"code":"02","series":0},{"code":"08","series":0},{"code":"03","series":0},{"code":"10","series":0},{"code":"04","series":0},{"code":"07","series":0},{"code":"06","series":0}]');

/*for hub*/
CREATE TABLE besi_slu_hub LIKE besi_old_hub;
INSERT INTO besi_slu_hub
SELECT *
FROM besi_old_hub
WHERE region = 'slu';

DELIMITER //

CREATE TRIGGER slu_insert
AFTER INSERT ON besi_employees_slu
FOR EACH ROW
BEGIN
    INSERT IGNORE INTO besi_users_slu (besi_id, email, full_name, location, position_code) 
    VALUES (NEW.emp_id, NEW.email, NEW.full_name, NEW.location, NEW.position);
END;
//

DELIMITER ;

//==============DONT USE THIS
SET FOREIGN_KEY_CHECKS = 0;
DELETE t1, t2 
FROM besi_employees_min AS t1
INNER JOIN besi_users_min AS t2 ON t1.email = t2.email
WHERE t1.id in (692,693,694);
SET FOREIGN_KEY_CHECKS = 1;

//==== force email to lower
UPDATE besi_employees_min SET email = LOWER(email) where BINARY email != LOWER(email);
//==================DONT USE THIS, FOR REPORTING
SELECT 
    r.region_label AS 'Region',
    COUNT(CASE WHEN e.position = '01' THEN 1 END) AS 'Rider',
    COUNT(CASE WHEN e.position = '02' THEN 1 END) AS 'Transporter',
    COUNT(CASE WHEN e.position = '03' THEN 1 END) AS 'FDS',
    COUNT(CASE WHEN e.position = '04' THEN 1 END) AS 'Sorter',
    COUNT(CASE WHEN e.position = '05' THEN 1 END) AS 'Hub Admin',
    COUNT(CASE WHEN e.position = '06' THEN 1 END) AS 'TK',
    COUNT(CASE WHEN e.position = '07' THEN 1 END) AS 'LeadCoord',
    COUNT(CASE WHEN e.position = '08' THEN 1 END) AS 'Coord',
    COUNT(CASE WHEN e.position = '10' THEN 1 END) AS 'TL',
    COUNT(e.position) AS 'Total Enrolled' -- Counts only actual employees, not the empty region row
FROM (
    -- This creates a fixed list of all your regions
    SELECT 'WVIS BACOLOD' AS region_label UNION ALL
    SELECT 'WVIS slu' UNION ALL
    SELECT 'NCR SMNL' UNION ALL
    SELECT 'BSL BICOL' UNION ALL
    SELECT 'BSL SMRLEYTE' UNION ALL
    SELECT 'MINDANAO' UNION ALL
    SELECT 'WVIS CENTRAL' UNION ALL
    SELECT 'NCR CMNL' UNION ALL
    SELECT 'NCR CMNVA' UNION ALL
    SELECT 'NELU'
) AS r
LEFT JOIN (
    -- This is your existing combined data
    SELECT 'WVIS BACOLOD' AS table_name, position FROM besi_employees_bacolod
    UNION ALL
    SELECT 'WVIS PANAY' AS table_name, position FROM besi_employees_panay
    UNION ALL
    SELECT 'NCR SMNL' AS table_name, position FROM besi_employees_smnl
    UNION ALL
    SELECT 'BSL BICOL' AS table_name, position FROM besi_employees_bicol
    UNION ALL
    SELECT 'BSL SMRLEYTE' AS table_name, position FROM besi_employees_smarleyte
    UNION ALL
    SELECT 'MINDANAO' AS table_name, position FROM besi_employees_min
    UNION ALL
    SELECT 'WVIS CENTRAL' AS table_name, position FROM besi_employees_central
    UNION ALL
    SELECT 'NCR CMNL' AS table_name, position FROM besi_employees_cmnl
    UNION ALL
    SELECT 'NCR CMNVA' AS table_name, position FROM besi_employees_cmnva
    UNION ALL
    SELECT 'NELU' AS table_name, position FROM besi_employees_nelu
) AS e ON r.region_label = e.table_name
GROUP BY r.region_label
ORDER BY `Total Enrolled` DESC;

select id, position,full_name, email, count(*) as existed
from besi_employees_smnl
group by full_name
having existed > 1;

// ===for adding columns
-- Bacolod
ALTER TABLE besi_employees_bacolod 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- Bicol
ALTER TABLE besi_employees_bicol 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- Central
ALTER TABLE besi_employees_central 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- CMNL
ALTER TABLE besi_employees_cmnl 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- CMNVA
ALTER TABLE besi_employees_cmnva 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- Mindanao (MIN)
ALTER TABLE besi_employees_min 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- North Luzon / New Ecija / Luzon (NELU)
ALTER TABLE besi_employees_nelu 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- Panay
ALTER TABLE besi_employees_panay 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- Samar-Leyte (SMARLEYTE)
ALTER TABLE besi_employees_smarleyte 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;

-- South Manila / South Luzon (SMNL)
ALTER TABLE besi_employees_smnl 
    ADD COLUMN daily_rate DECIMAL(10, 2) AFTER position,
    ADD COLUMN education_level VARCHAR(150) AFTER daily_rate;


/*  ancaja ALL TABLES FOR A CERTAIN NAME 
WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'
*/
SELECT 'bacolod' AS source_table, full_name, emp_id FROM besi_employees_bacolod WHERE full_name LIKE '%a
UNION ALL
SELECT 'bicol' AS source_table, full_name, emp_id FROM besi_employees_bicol WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'central' AS source_table, full_name, emp_id FROM besi_employees_central WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'cmnl' AS source_table, full_name, emp_id FROM besi_employees_cmnl WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'cmnva' AS source_table, full_name, emp_id FROM besi_employees_cmnva WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'smnl' AS source_table, full_name, emp_id FROM besi_employees_smnl WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'hpro' AS source_table, full_name, emp_id FROM besi_employees_hpro WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'min' AS source_table, full_name, emp_id FROM besi_employees_min WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'nelu' AS source_table, full_name, emp_id FROM besi_employees_nelu WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'nwlu' AS source_table, full_name, emp_id FROM besi_employees_nwlu WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'panay' AS source_table, full_name, emp_id FROM besi_employees_panay WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'slu' AS source_table, full_name, emp_id FROM besi_employees_slu WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'smarleyte' AS source_table, full_name, emp_id FROM besi_employees_smarleyte WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'yncr' AS source_table, full_name, emp_id FROM besi_employees_yncr WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'yslu' AS source_table, full_name, emp_id FROM besi_employees_yslu WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'

UNION ALL
SELECT 'ynelu' AS source_table, full_name, emp_id FROM besi_employees_ynelu WHERE full_name REGEXP 'ancajas|lonzares|bebania|burlaza|cassion|
dagoc|gabani|gilo|iguis|laguidao|pangasian|pines|pollido|rindado|salipot|teofilo|torio'
;

//===================FOR DELETE
SELECT hub, COUNT(*) 
FROM besi_x_hub 
GROUP BY hub 
HAVING COUNT(*) > 1;

//DELETE OLDEST COPY
DELETE t1 FROM besi_x_hub t1
INNER JOIN besi_x_hub t2 
ON t1.hub = t2.hub AND t1.id > t2.id;

//DELETE NEWEST COPY
DELETE t1 FROM besi_x_hub t1
INNER JOIN besi_x_hub t2 
ON t1.hub = t2.hub AND t1.id < t2.id;

//delete from ALL HUB  delete oldest copy
SELECT CONCAT(
    'DELETE t1 FROM ', table_name, ' t1 ',
    'INNER JOIN ', table_name, ' t2 ',
    'ON t1.hub = t2.hub AND t1.id < t2.id;'
) AS delete_queries
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name LIKE 'besi_%_hub';

