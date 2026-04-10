/*timekeep*/
create table besi_timekeep_smarleyte like besi_timekeep_nelu;
/* users */
create table besi_users_smarleyte like besi_users_nelu;
/* employeess main */
create table besi_employees_smarleyte like besi_employees_nelu;
/*series*/
create table besi_smarleyte_series like besi_nelu_series;

/*for hub*/
CREATE TABLE besi_smarleyte_hub LIKE besi_old_hub;
INSERT INTO besi_smarleyte_hub
SELECT *
FROM besi_old_hub
WHERE region = 'bsl-smarleyte';