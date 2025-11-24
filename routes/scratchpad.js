//===== version that's working
//======= Search Employee, region, by date for downloadable xls =======//
// Assuming 'db' is your mysql2 connection pool and 'upload' is your multer setup
// Example:
// const mysql = require('mysql2/promise');
// const multer = require('multer');
// const db = mysql.createPool({...});
// const upload = multer();

router.post('/searchempTimeKeep', upload.none(), async (req, res) => {
    // console.log( req.body ) // Uncomment for debugging request body
    const filters = {
        name: req.body.filter_name,
        id: req.body.filter_id,
        region: req.body.filter_region, // This is crucial for dynamic table names
        position: req.body.filter_position,
        date_from: req.body.filter_date_from,
        date_to: req.body.filter_date_to
    };

    // Basic validation for region, as it's used to construct table names
    if (!filters.region || filters.region.trim() === '') {
        return res.status(400).json({ success: false, message: 'Region filter is required to identify the correct tables.' });
    }

    try {
        const { sql, params } = buildPersonnelSearchQuery(filters,true);
        console.log('Generated SQL:', sql);
        console.log('Parameters:', params);

        // =====================================================================
        // Execute the query using the mysql2 connection pool
        const [rows] = await db.query(sql, params); // pool.execute returns [rows, fields]
        // =====================================================================
        // console.log(rows) // Uncomment for debugging query results
        return res.status(200).json({success: true, msg: 'SUCCESS', xdata: rows});

    } catch (error) {
        console.error('Error executing search query:', error.message);
        // Send a user-friendly error message for server errors
        res.status(500).json({ success: false, message: 'An error occurred while fetching timekeeping data. Please try again later.' });
    }
});

/**
 * Builds an SQL query for personnel search, optionally including timekeeping data.
 * @param {object} filters - An object containing various filters (name, id, region, position, date_from, date_to).
 * @param {boolean} isTimeKeep - If true, joins with timekeeping table and aggregates data. If false, only queries the users table.
 * @returns {{sql: string, params: Array}} An object containing the generated SQL query and its parameters.
 */
function buildPersonnelSearchQuery(filters, isTimeKeep = false) {
    let { name, id, region, position, date_from, date_to } = filters;
    const params = [];
    const conditions = []; // For WHERE clause conditions

    // Sanitize region for dynamic table names (e.g., 'NCR-CMNL' -> 'ncr_cmnl')
    const regionClean = region.trim().toLowerCase().replace(/-/g, '_');
    const userTableName = `besi_users_${regionClean}`;

    let sql = '';

    if (isTimeKeep) {
        // --- Timekeeping Query Logic ---
        const timekeepTableName = `besi_timekeep_${regionClean}`;

        // Determine Date Range
        let finalDateFrom, finalDateTo;
        if (date_from && date_from.trim() !== '' && date_to && date_to.trim() !== '') {
            // Use provided dates if both are present
            finalDateFrom = date_from.trim();
            finalDateTo = date_to.trim();
        } else {
            // Default to current month's data if dates are not provided
            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed

            finalDateFrom = `${year}-${month}-01`;
            // Get the last day of the current month
            const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
            finalDateTo = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        }

        sql = `
            SELECT
				u.id,
				u.email,
                u.besi_id,
                u.ocw_id,
                u.jms_id,
                u.full_name,
                u.position_code,
                COALESCE(SUM(tk.total_hours), 0) AS total_worked_hours,
                COALESCE(SUM(tk.ot_hours), 0) AS total_overtime_hours,
                MIN(tk.login_time) AS first_login_time_in_period,
                MAX(tk.logout_time) AS last_logout_time_in_period,
                MIN(tk.entry_date) AS first_timekeep_date,
                MAX(tk.entry_date) AS last_timekeep_date
            FROM
                \`${userTableName}\` AS u
            LEFT JOIN
                \`${timekeepTableName}\` AS tk
                ON u.id = tk.user_id AND tk.entry_date BETWEEN ? AND ?
        `;
        params.push(finalDateFrom, finalDateTo);

        // Add user-specific conditions to the main WHERE clause (prefixed with 'u.')
        if (name && name.trim() !== '') {
            conditions.push(`LOWER(u.full_name) LIKE LOWER(?)`);
            params.push(`%${name.trim()}%`);
        }

        if (id && id.trim() !== '') {
            conditions.push(`u.besi_id = ?`);
            params.push(id.trim());
        }

        if (position && position.trim() !== '') {
            conditions.push(`u.position_code = ?`);
            params.push(position.trim());
        }

        // Combine user conditions into the WHERE clause
        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }

        // Add GROUP BY for aggregation
        sql += `
            GROUP BY
                u.besi_id, u.ocw_id, u.jms_id, u.full_name, u.position_code
        `;

        sql += ` ORDER BY u.full_name ASC;`;

    } else {
        // --- Standard Personnel Search (No Timekeeping) Logic ---
        sql = `SELECT * FROM \`${userTableName}\``;

        if (name && name.trim() !== '') {
            conditions.push(`LOWER(full_name) LIKE LOWER(?)`);
            params.push(`%${name.trim()}%`);
        }

        if (id && id.trim() !== '') {
            conditions.push(`besi_id = ?`);
            params.push(id.trim());
        }

        if (position && position.trim() !== '') {
            conditions.push(`position_code = ?`);
            params.push(position.trim());
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }

        sql += ` ORDER BY full_name ASC;`;
    }

    return { sql, params };
}





// --- EXPRESS ROUTE (replace your existing router.post) ---
router.post('/searchempTimeKeep', upload.none(), async (req, res) => {
    // console.log( req.body ) // Uncomment for debugging request body
    const filters = {
        name: req.body.filter_name,
        id: req.body.filter_id,
        region: req.body.filter_region,
        position: req.body.filter_position,
        date_from: req.body.filter_date_from,
        date_to: req.body.filter_date_to
    };

    if (!filters.region || filters.region.trim() === '') {
        return res.status(400).json({ success: false, message: 'Region filter is required to identify the correct tables.' });
    }

    try {
        // buildPersonnelSearchQuery now returns the effective dateRange
        const { sql, params, dateRange } = buildPersonnelSearchQuery(filters, true); // Pass true for isTimeKeep
        console.log('Generated SQL:', sql);
        console.log('Parameters:', params);

        const [rawRows] = await db.query(sql, params); // Get all detailed records

        // --- POST-PROCESSING: Grouping and Aggregating in Node.js ---

        const { from: finalDateFrom, to: finalDateTo } = dateRange;
        const allDatesInPeriod_YYYYMMDD = getDatesInRange(finalDateFrom, finalDateTo);

        const employeesMap = new Map();

        // First pass: Populate employee base data and store raw timekeeping records by date
        rawRows.forEach(row => {
            const besiId = row.besi_id;

            if (!employeesMap.has(besiId)) {
                employeesMap.set(besiId, {
                    id: row.id,
                    email: row.email,
                    besi_id: row.besi_id,
                    ocw_id: row.ocw_id,
                    jms_id: row.jms_id,
                    full_name: row.full_name,
                    position_code: row.position_code,
                    total_worked_hours: 0, // Will be calculated in second pass
                    total_overtime_hours: 0, // Will be calculated in second pass
                    first_login_time_in_period: null, // Will be formatted at the very end
                    last_logout_time_in_period: null, // Will be formatted at the very end
                    _raw_first_login_time_in_period: null, // Temporary storage for raw date comparison
                    _raw_last_logout_time_in_period: null,  // Temporary storage for raw date comparison
                    timekeeping_records_by_date: new Map() // Temporary storage for quick lookup by YYYY-MM-DD
                });
            }

            const employee = employeesMap.get(besiId);

            // If there's an actual timekeeping record for this row and it's a valid string date
            if (typeof row.tk_entry_date === 'string' && row.tk_entry_date.trim() !== '') {
                // Robustly extract YYYY-MM-DD part from the entry_date string
                const dateKey_YYYYMMDD = row.tk_entry_date.split(' ')[0].split('T')[0];

                // Store the processed record including raw times for comparison
                employee.timekeeping_records_by_date.set(dateKey_YYYYMMDD, {
                    xdate: formatDateToMMDDYY(dateKey_YYYYMMDD),
                    login: formatDateTimeToMMDDYYHHMM(row.tk_login_time),
                    logout: formatDateTimeToMMDDYYHHMM(row.tk_logout_time),
                    total_hours: parseFloat(row.tk_total_hours || 0),
                    ot_hours: parseFloat(row.tk_ot_hours || 0),
                    _raw_login_time: row.tk_login_time, // Keep raw for comparison
                    _raw_logout_time: row.tk_logout_time // Keep raw for comparison
                });

                // Update raw summary times for the employee (only if valid login/logout times exist)
                if (row.tk_login_time) {
                    if (!employee._raw_first_login_time_in_period || new Date(row.tk_login_time) < new Date(employee._raw_first_login_time_in_period)) {
                        employee._raw_first_login_time_in_period = row.tk_login_time;
                    }
                }
                if (row.tk_logout_time) {
                    if (!employee._raw_last_logout_time_in_period || new Date(row.tk_logout_time) > new Date(employee._raw_last_logout_time_in_period)) {
                        employee._raw_last_logout_time_in_period = row.tk_logout_time;
                    }
                }
            }
            // Records with null/invalid tk_entry_date will not be added to timekeeping_records_by_date,
            // which is correct as they don't represent a valid daily entry.
        });

        // Second pass: Build `login_details` with all dates in the range, and finalize summaries
        const formattedResults = [];
        employeesMap.forEach(employee => {
            const loginDetailsArray = [];
            employee.total_worked_hours = 0; // Reset for recalculation from the explicit login_details array
            employee.total_overtime_hours = 0; // Reset for recalculation

            allDatesInPeriod_YYYYMMDD.forEach(currentDate_YYYYMMDD => {
                const record = employee.timekeeping_records_by_date.get(currentDate_YYYYMMDD);

                if (record) {
                    loginDetailsArray.push({
                        xdate: record.xdate,
                        login: record.login,
                        logout: record.logout,
                        total_hours: record.total_hours,
                        ot_hours: record.ot_hours,
                    });
                    // Aggregate totals from actual records that were found
                    employee.total_worked_hours += record.total_hours;
                    employee.total_overtime_hours += record.ot_hours;
                } else {
                    // No record for this date, push an empty one with the date
                    loginDetailsArray.push({
                        xdate: formatDateToMMDDYY(currentDate_YYYYMMDD),
                        login: null,
                        logout: null,
                        total_hours: 0,
                        ot_hours: 0
                    });
                }
            });

            employee.login_details = loginDetailsArray; // Assign the full array

            // Format final summary times
            if (employee._raw_first_login_time_in_period) {
                employee.first_login_time_in_period = formatDateTimeToMMDDYYHHMM(employee._raw_first_login_time_in_period);
            }
            if (employee._raw_last_logout_time_in_period) {
                employee.last_logout_time_in_period = formatDateTimeToMMDDYYHHMM(employee._raw_last_logout_time_in_period);
            }

            // Clean up temporary fields
            delete employee._raw_first_login_time_in_period;
            delete employee._raw_last_logout_time_in_period;
            delete employee.timekeeping_records_by_date;

            formattedResults.push(employee);
        });

        formattedResults.sort((a, b) => a.full_name.localeCompare(b.full_name));

        return res.status(200).json({success: true, msg: 'SUCCESS', xdata: formattedResults});

    } catch (error) {
        console.error('Error executing search query:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while fetching data. Please try again later.' });
    }
});
