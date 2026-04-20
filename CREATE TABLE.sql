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