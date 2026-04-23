/*timekeep*/
create table besi_timekeep_panay like besi_timekeep_nelu;
/* users */
create table besi_users_panay like besi_users_nelu;
/* employeess main */
create table besi_employees_panay like besi_employees_nelu;
/*series*/
create table besi_panay_series like besi_nelu_series;

INSERT INTO `besi_panay_series` (`series_data`) 
VALUES ('[{"code":"01","series":0},{"code":"02","series":0},{"code":"08","series":0},{"code":"03","series":0},{"code":"10","series":0},{"code":"04","series":0},{"code":"07","series":0},{"code":"06","series":0}]');

/*for hub*/
CREATE TABLE besi_panay_hub LIKE besi_old_hub;
INSERT INTO besi_panay_hub
SELECT *
FROM besi_old_hub
WHERE region = 'wvis-panay';

DELIMITER //

CREATE TRIGGER bacolod_insert
AFTER INSERT ON besi_employees_bacolod
FOR EACH ROW
BEGIN
    INSERT IGNORE INTO besi_users_bacolod (besi_id, email, full_name, location, position_code) 
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
    SELECT 'WVIS PANAY' UNION ALL
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