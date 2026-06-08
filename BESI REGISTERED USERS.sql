SELECT 
    u.region,
    u.full_name,
    u.position_code,
    p.position AS position_name,
    u.hire_date,
    u.location,
    u.hub,
    u.date_added
FROM (
    SELECT 'Bacolod' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_bacolod usr
    LEFT JOIN besi_employees_bacolod emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'Bicol' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_bicol usr
    LEFT JOIN besi_employees_bicol emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'Central' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_central usr
    LEFT JOIN besi_employees_central emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'CMNVA' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_cmnva usr
    LEFT JOIN besi_employees_cmnva emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'CMNL' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_cmnl usr
    LEFT JOIN besi_employees_cmnl emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'MIN' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_min usr
    LEFT JOIN besi_employees_min emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'NELU' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_nelu usr
    LEFT JOIN besi_employees_nelu emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'Panay' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_panay usr
    LEFT JOIN besi_employees_panay emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'Samar-Leyte' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_smarleyte usr
    LEFT JOIN besi_employees_smarleyte emp ON emp.emp_id = usr.besi_id

    UNION ALL

    SELECT 'SMNL' AS region, usr.full_name, usr.position_code, emp.hire_date, emp.location, emp.hub, usr.date_added 
    FROM besi_users_smnl usr
    LEFT JOIN besi_employees_smnl emp ON emp.emp_id = usr.besi_id
) u
LEFT JOIN asn_position p 
    ON u.position_code = p.code;
