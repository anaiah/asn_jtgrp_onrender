/*

AUTHOR : CARLO DOMINGUEZ

multiple comment //// => IMPORTANT
*/
const express = require('express')

const Utils = require('./util')//== my func
//const QRPDF = require('./qrpdf')
const asnpdf = require('./asnpdf')//=== my own module

const cookieParser = require('cookie-parser')

const cors = require('cors')

const path = require('path')

const axios = require('axios')

const formdata = require('form-data')

// const jsftp = require("jsftp");

const fetcher = require('node-fetch')

const IP = require('ip')

const iprequest = require('request-ip')

const querystring = require("querystring")

const nodemailer = require("nodemailer")

const router = express.Router()

const fs = require('fs');

const PuppeteerHTMLPDF = require('puppeteer-html-pdf');

const pdf = require('html-pdf');//used for pdf.create

const hbar = require('handlebars'); //html template
const QRCode = require('qrcode')  // qrcode maker
const multer = require('multer') // for file manipulate
const sharp = require('sharp')   // for image manipulate

const ftpclient = require('scp2')

const app = express()

app.use( cookieParser() )

const db  = require('../db')// your pool module

const { connectDb, closeDb } = require('../db')

//=====CLAIMS UPLOAD
// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

const xlsx = require('xlsx');

const mysqls = require('mysql2/promise')
const { emitWarning } = require('process')



module.exports = (io) => {

	const dbconfig  ={
	//host: '153.92.15.50',//'srv1759.hstgr.io',
	host: 'srv1759.hstgr.io',
	user: 'u899193124_asianowjt',
	password: 'M312c4@g125c3',
	database: 'u899193124_asianowjt'
}


const formatDate = (dateValue) => {
  if (!dateValue) return null;

  if (typeof dateValue === 'number') {
    // Convert Excel serial date to JS Date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel's epoch
    const date = new Date(excelEpoch.getTime() + dateValue * 86400 * 1000);
    const year = date.getUTCFullYear();
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    const day = ('0' + date.getUTCDate()).slice(-2);
    return `${year}-${month}-${day}`;
  } else {
    // handle string date
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
};

//=====Search Employee====//
router.post('/searchemp', upload.none(), async (req, res) => {
	//console.log( req.body )
	const filters = {
        name: req.body.filter_name,
        id: req.body.filter_id,
        region: req.body.filter_region,
        position: req.body.filter_position
    };

    try {
        const { sql, params } = buildPersonnelSearchQuery(filters,false);
        console.log('Generated SQL:', sql);
        console.log('Parameters:', params);

        // =====================================================================
        // Execute the query using the mysql2 connection pool
        const [rows] = await db.query(sql, params); // pool.execute returns [rows, fields]
        // =====================================================================
		console.log(rows)
		return res.status(200).json({success:'true',msg:'SUCCESS',xdata:rows})
        //res.json(rows); // Send the query results back to the frontend

    } catch (error) {
        console.error('Error executing search query:', error.message);
        // Send a user-friendly error message
        res.status(400).json({ success: false, message: error.message });
    }
	
});


// --- HELPER FUNCTIONS (Place these outside your router.post or in a utility file) ---

// Helper function to format date to MM-DD-YY
function formatDateToMMDDYY(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${day}-${year}`;
}

// Helper function to format datetime to MM-DD-YY HH:MM (24-hour)
function formatDateTimeToMMDDYYHHMM(dateTimeString) {
    if (!dateTimeString) return null;
    const date = new Date(dateTimeString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day}-${year} ${hours}:${minutes}`;
}

// Helper function to generate an array of YYYY-MM-DD date strings within a range
function getDatesInRange(startDateStr, endDateStr) {
    const dates = [];
    let currentDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    while (currentDate.getTime() <= endDate.getTime()) {
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}


// --- EXPRESS ROUTE (Updated) ---

// Assuming 'db' is your mysql2 connection pool and 'upload' is your multer setup
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
        const { sql, params, dateRange } = buildPersonnelSearchQuery(filters, true);
        console.log('Generated SQL:', sql);
        console.log('Parameters:', params);

        const [rawRows] = await db.query(sql, params);

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
                    total_worked_hours: 0, // Initialized
                    total_overtime_hours: 0, // Initialized
                    first_login_time_in_period: null,
                    last_logout_time_in_period: null,
                    _raw_first_login_time_in_period: null,
                    _raw_last_logout_time_in_period: null,
                    timekeeping_records_by_date: new Map()
                });
            }

            const employee = employeesMap.get(besiId);

            let dateKey_YYYYMMDD = null;

            // --- FIX FOR XDATE MISMATCH ---
            if (row.tk_entry_date instanceof Date) {
                // If it's a Date object, get its LOCAL date components (year, month, day)
                const year = row.tk_entry_date.getFullYear();
                const month = (row.tk_entry_date.getMonth() + 1).toString().padStart(2, '0');
                const day = row.tk_entry_date.getDate().toString().padStart(2, '0');
                dateKey_YYYYMMDD = `${year}-${month}-${day}`;
            } else if (typeof row.tk_entry_date === 'string' && row.tk_entry_date.trim() !== '') {
                // If it's a non-empty string, extract 'YYYY-MM-DD' part
                dateKey_YYYYMMDD = row.tk_entry_date.split(' ')[0].split('T')[0];
            }

            if (dateKey_YYYYMMDD) {
                employee.timekeeping_records_by_date.set(dateKey_YYYYMMDD, {
                    xdate: formatDateToMMDDYY(dateKey_YYYYMMDD), // Use the correctly derived YYYY-MM-DD string
                    login: formatDateTimeToMMDDYYHHMM(row.tk_login_time),
                    logout: formatDateTimeToMMDDYYHHMM(row.tk_logout_time),
                    total_hours: parseFloat(row.tk_total_hours || 0),
                    ot_hours: parseFloat(row.tk_ot_hours || 0),
                    _raw_login_time: row.tk_login_time,
                    _raw_logout_time: row.tk_logout_time
                });

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
        });

        // Second pass: Build `login_details` with all dates in the range, and finalize summaries
        const formattedResults = [];
        employeesMap.forEach(employee => {
            const loginDetailsArray = [];
            employee.total_worked_hours = 0; // Explicitly reset again before recalculation
            employee.total_overtime_hours = 0; // Explicitly reset again before recalculation

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

            employee.login_details = loginDetailsArray;

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

        // --- FINAL CHECK BEFORE SENDING RESPONSE ---
        // console.log('\n--- FINAL FORMATTED RESULTS (first item) ---');
        // if (formattedResults.length > 0) {
        //     console.log(JSON.stringify(formattedResults[0], null, 2));
        // }
        // console.log('-------------------------------------------\n');
        // --- END FINAL CHECK ---

        return res.status(200).json({success: true, msg: 'SUCCESS', xdata: formattedResults});

    } catch (error) {
        console.error('Error executing search query:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while fetching data. Please try again later.' });
    }
});

// --- buildPersonnelSearchQuery Function (unchanged and should be placed below the route) ---
// (Your buildPersonnelSearchQuery function should be exactly as in the previous full update)
// It was correct in using tk.entry_date AS tk_entry_date and tk.entry_date BETWEEN ? AND ?

// --- buildPersonnelSearchQuery function (remains the same as previous perfect version) ---

/**
 * Builds an SQL query for personnel search, optionally including detailed timekeeping data.
 * @param {object} filters - An object containing various filters (name, id, region, position, date_from, date_to).
 * @param {boolean} isTimeKeep - If true, joins with timekeeping table and selects individual daily entries. If false, only queries the users table.
 * @returns {{sql: string, params: Array, dateRange?: {from: string, to: string}}} An object containing the generated SQL query, its parameters, and the effective date range if timekeeping data is requested.
 */
function buildPersonnelSearchQuery(filters, isTimeKeep = false) {
    let { name, id, region, position, date_from, date_to } = filters;
    const params = [];
    const conditions = [];

    const regionClean = region.trim().toLowerCase().replace(/-/g, '_');
    const userTableName = `besi_users_${regionClean}`;

    let sql = '';
    let effectiveDateRange = null;

    if (isTimeKeep) {
        // --- Timekeeping Query Logic (Detailed Daily Entries) ---
        const timekeepTableName = `besi_timekeep_${regionClean}`;

        let finalDateFrom, finalDateTo;
        if (date_from && date_from.trim() !== '' && date_to && date_to.trim() !== '') {
            finalDateFrom = date_from.trim();
            finalDateTo = date_to.trim();
        } else {
            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');

            finalDateFrom = `${year}-${month}-01`;
            const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
            finalDateTo = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        }
        effectiveDateRange = { from: finalDateFrom, to: finalDateTo };

        sql = `
            SELECT
                u.id,
                u.email,
                u.besi_id,
                u.ocw_id,
                u.jms_id,
                u.full_name,
                u.position_code,
                tk.entry_date AS tk_entry_date,
                tk.login_time AS tk_login_time,
                tk.logout_time AS tk_logout_time,
                tk.total_hours AS tk_total_hours,
                tk.ot_hours AS tk_ot_hours
            FROM
                \`${userTableName}\` AS u
            LEFT JOIN
                \`${timekeepTableName}\` AS tk
                ON u.id = tk.user_id AND tk.entry_date BETWEEN ? AND ?
        `;
        params.push(finalDateFrom, finalDateTo);

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

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }

        sql += ` ORDER BY u.besi_id ASC, tk.entry_date ASC;`;

    } else {
        // --- Standard Personnel Search (No Timekeeping) Logic ---
        sql = `SELECT id, email, besi_id, ocw_id, jms_id, full_name, position_code FROM \`${userTableName}\``;

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

    return { sql, params, dateRange: effectiveDateRange };
}



// === HRIS UPLOAD EXCEL ===
router.post('/xlshris', upload.single('hris_upload_file'), async (req, res) => {
  console.log('==FIRING hris XLS for region:', req.body.hrisload_region);
  try {
    const regionCode = req.body.hrisload_region; // e.g., SMNL
    const poscode = req.body.hrisload_position; // '01', '02', etc.
    const regionLower = regionCode.toLowerCase();

    const xtable = `besi_users_${regionLower}`;
    const seriesTable = `besi_${regionCode.toLowerCase()}_series`;

    const conn = await mysqls.createConnection(dbconfig);

    // Fetch current series JSON once
    const [seriesRows] = await conn.execute(`SELECT series_data FROM ${seriesTable} WHERE id=1`);

	let seriesData;
	if (seriesRows.length && seriesRows[0]?.series_data) {
		try {
			seriesData = JSON.parse(seriesRows[0].series_data);
		} catch (e) {
			console.error('Failed to parse series_data JSON', e);
			seriesData = [
			{ "code": "01", "series": 1 },
			{ "code": "02", "series": 1 }
			];
		}
		} else {
		seriesData = [
			{ "code": "01", "series": 1 },
			{ "code": "02", "series": 1 }
		];
	}

    // Find the current series for this position, or initialize
    let seriesObj = seriesData.find(s => s.code === poscode);
    if (!seriesObj) {
      seriesObj = { code: poscode, series: 1 };
      seriesData.push(seriesObj);
    }

    let lastSeriesNumber = seriesObj.series; // get the latest series number store in var

    // Helper: get date string as yymmdd
    const getDateString = (date) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear().toString().slice(-2);
      const m = ('0' + (d.getMonth() + 1)).slice(-2);
      const day = ('0' + d.getDate()).slice(-2);
      return `${m}${day}${y}`;
    };

    // Read Excel
    const workbook = xlsx.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    for (const record of data) {
		if (!record || Object.values(record).every(val => val === null || val === '')) {
			continue; // skip empty
		}

		// Destructure fields
		const {
			ocw_id,
			jms_id,
			first_name,
			middle_name,
			last_name,
			full_name,
			date_hired,
			email,
			hub,
			position_code
		} = record;

		const formattedDateHired = formatDate(date_hired);
		const emailLower = (email ?? '').toLowerCase();

		// Generate emp_id using lastSeriesNumber
		const datePart = getDateString(formattedDateHired) || getDateString(new Date());
		const seqStr = ('0000' + lastSeriesNumber).slice(-4); // pad 4 digits

		const emp_id = `BE-${regionCode.toUpperCase()}-${datePart}-${poscode}${seqStr}`;

		// Insert user
		const query = `INSERT INTO ${xtable} (besi_id, ocw_id, jms_id, first_name, middle_name, last_name, full_name, date_hired, email, hub, position_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		
		// Replace undefined with null
		const params = [
			emp_id,
			ocw_id ?? null,
			jms_id ?? null,
			first_name ?? null,
			middle_name ?? null,
			last_name ?? null,
			full_name ?? null,
			formattedDateHired , // use formatted date here
			emailLower,
			hub ?? null,
			position_code ?? null
		];

		await conn.execute(query, params);

		// Increment for next record
		lastSeriesNumber += 1;
	}

	// Now update the series table with latest number
	seriesObj.series = lastSeriesNumber; // update the object
	await conn.execute(`UPDATE ${seriesTable} SET series_data = ? WHERE id=1`, [JSON.stringify(seriesData)]);

	await conn.end();

	console.log('SUCCESS: Excel uploaded and data inserted. Series updated.');
	res.status(200).json({ message: 'H.R.I.S. Excel File uploaded and data saved!', status: true });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// --- Make sure your nuDate() function is defined and accessible ---
// Example nuDate() function (adjust if yours is different):
const hrisDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const datestr = `${year}-${month}-${day}`; // YYYY-MM-DD
    const datetimestr = `${datestr} ${hours}:${minutes}:${seconds}`; // YYYY-MM-DD HH:MM:SS
    return [datestr, datetimestr];
};
// --- End nuDate() definition ---

//timekeeping
// Assume 'router' is an Express Router instance and 'db' is your database connection pool
// Assume 'upload' is configured correctly (e.g., from multer as upload.none())
// Assume 'hrisDate' is a helper function that returns an array [today_date_str, now_datetime_str]

router.post('/timekeep', upload.none(), async (req, res) => {
    console.log(req.body);

    const region = req.body.region;
    console.log('TIMEKEEP for region:', region);

    const [today_date_str, now_datetime_str] = nuDate(); //hrisDate();
    const xtable = `besi_timekeep_${region}`;
    const userId = parseInt(req.body.user_id);
    const actionType = req.body.action_type; // Expects "1" for login, "2" for logout

    try {
        // --- Step 1: Check for existing entry for this user and today's date ---
        // We select 'id', 'login_time', 'logout_time' to use for subsequent logic and calculations
        const checkEntrySql = `
            SELECT id, login_time, logout_time
            FROM ${xtable.toLowerCase()}
            WHERE user_id = ? AND entry_date = ?;
        `;
        const [existingEntries] = await db.query(checkEntrySql, [userId, today_date_str]);
        const existingEntry = existingEntries[0]; // Will be undefined if no entry exists

        // --- Logic for Login Action (actionType === "1") ---
        if (actionType === "1") {
            if (existingEntry) {
                // An entry for this user and date already exists
                if (existingEntry.login_time) {
                    // User has already logged in today
                    console.log(`Duplicate login attempt for user ${userId} on ${today_date_str}.`);
                    return res.status(200).json({
                        success: true,
                        msg: `You have already logged in today at ${new Date(existingEntry.login_time).toLocaleTimeString()}!`,
                        errCode: 'ERR_DUP_LOGIN'
                    });
                } else {
                    // Entry exists, but login_time is NULL (e.g., a logout was recorded first, or pre-created entry)
                    // UPDATE the existing record to set login_time
                    const updateLoginSql = `
                        UPDATE ${xtable}
                        SET login_time = ?
                        WHERE id = ?;
                    `;
                    await db.query(updateLoginSql, [now_datetime_str, existingEntry.id]);
                    console.log(`User ${userId} login updated for ${today_date_str}.`);
                }
            } else {
                // No entry for today, INSERT a brand new one with login_time
                const insertLoginSql = `
                    INSERT INTO ${xtable} (user_id, entry_date, login_time)
                    VALUES (?, ?, ?);
                `;
                await db.query(insertLoginSql, [userId, today_date_str, now_datetime_str]);
                console.log(`User ${userId} logged in for the first time today.`);
            }

            const retdata = { success: true, time: now_datetime_str, msg: 'Login recorded successfully!' };
            return res.status(200).json(retdata);

        }
        // --- Logic for Logout Action (actionType === "2") ---
        else if (actionType === "2") {
            if (!existingEntry || !existingEntry.login_time) {
                // No entry for today, or login_time is NULL (user hasn't logged in yet)
                console.log(`Logout attempt without prior login for user ${userId} on ${today_date_str}.`);
                return res.status(200).json({
                    success: true,
                    msg: 'You must log in first before logging out!',
                    errCode: 'ERR_NO_LOGIN'
                });
            } else if (existingEntry.logout_time) {
                // User has already logged out today
                console.log(`Duplicate logout attempt for user ${userId} on ${today_date_str}.`);
                return res.status(200).json({
                    success: true,
                    msg: `You have already logged out today at ${new Date(existingEntry.logout_time).toLocaleTimeString()}!`,
                    errCode: 'ERR_DUP_LOGOUT'
                });
            } else {
                // All good: User logged in, hasn't logged out yet. Calculate hours and update the record.

                // Parse times into Date objects for calculation
                const loginTime = new Date(existingEntry.login_time);
                const logoutTime = new Date(now_datetime_str);

                // Basic validation: ensure logout is not before login (shouldn't happen with normal flow)
                if (logoutTime < loginTime) {
                    console.warn(`Logout time (${logoutTime}) is before login time (${loginTime}) for user ${userId}.`);
                    return res.status(200).json({
                        success: true,
                        msg: 'Logout time cannot be before login time.',
                        errCode: 'ERR_INVALID_LOGOUT_TIME'
                    });
                }

                // Calculate total_hours in milliseconds, then convert to hours
                const timeDiffMs = logoutTime.getTime() - loginTime.getTime();
                const calculatedTotalHours = parseFloat((timeDiffMs / (1000 * 60 * 60)).toFixed(2)); // Convert ms to hours, round to 2 decimal places

                // Calculate ot_hours (overtime hours, assuming 9 hours is regular)
                const regularHoursThreshold = 9;
                const calculatedOtHours = parseFloat(Math.max(0, calculatedTotalHours - regularHoursThreshold).toFixed(2));

                const updateLogoutSql = `
                    UPDATE ${xtable}
                    SET logout_time = ?, total_hours = ?, ot_hours = ?
                    WHERE id = ?;
                `;
                await db.query(updateLogoutSql, [now_datetime_str, calculatedTotalHours, calculatedOtHours, existingEntry.id]);
                console.log(`User ${userId} logged out for ${today_date_str}. Total Hours: ${calculatedTotalHours}, OT Hours: ${calculatedOtHours}`);

                const retdata = {
                    success: true,
                    time: now_datetime_str,
                    msg: 'Logout recorded successfully!',
                    total_hours: calculatedTotalHours,
                    ot_hours: calculatedOtHours
                };
                return res.status(200).json(retdata);
            }
        }
        // --- Logic for Invalid Action Type ---
        else {
            console.log(`Invalid action type received: ${actionType} for user ${userId}.`);
            return res.status(400).json({
                success: false,
                msg: 'Invalid action type. Expected "1" for login or "2" for logout.',
                errCode: 'ERR_INVALID_ACTION'
            });
        }

    } catch (err) {
        console.error('Error in /timekeep route:', err);
        return res.status(500).json({ success: false, msg: 'DATABASE ERROR, PLEASE TRY AGAIN!!!', errCode: 'ERR_SERVER' });
    }
});


/*
router.post('/timekeep', upload.none(), async (req, res) => {
    // Get current date and datetime strings

	console.log( req.body)

	const region = req.body.region

	console.log('TIMEKEEP for region:', region);

    const [today_date_str, now_datetime_str] = hrisDate();
    const xtable = `besi_timekeep_${region}`;
    const userId = parseInt(req.body.user_id);
    const actionType = req.body.action_type; // Expects "1" for login, "2" for logout

    try {
        // --- Step 1: Check for existing entry for this user and today's date ---
        // We select the 'id' (primary key) to use for subsequent UPDATE statements
        const checkEntrySql = `
            SELECT id, login_time, logout_time
            FROM ${xtable.toLowerCase()}
            WHERE user_id = ? AND entry_date = ?;
        `;
        const [existingEntries] = await db.query(checkEntrySql, [userId, today_date_str]);
        const existingEntry = existingEntries[0]; // Will be undefined if no entry exists

        // --- Logic for Login Action (actionType === "1") ---
        if (actionType === "1") {
            if (existingEntry) {
                // An entry for this user and date already exists
                if (existingEntry.login_time) {
                    // User has already logged in today
                    console.log(`Duplicate login attempt for user ${userId} on ${today_date_str}.`);
                    return res.status(200).json({ // 409 Conflict indicates a duplicate action
                        success: true,
                        msg: `You have already logged in today at ${new Date(existingEntry.login_time).toLocaleTimeString()}!`,
                        errCode: 'ERR_DUP_LOGIN' // Custom error code for client-side handling
                    });
                } else {
                    // Entry exists, but login_time is NULL (e.g., a logout was recorded first, or pre-created entry)
                    // UPDATE the existing record to set login_time
                    const updateLoginSql = `
                        UPDATE ${xtable}
                        SET login_time = ?
                        WHERE id = ?;
                    `;
                    await db.query(updateLoginSql, [now_datetime_str, existingEntry.id]);
                    console.log(`User ${userId} login updated for ${today_date_str}.`);
                }
            } else {
                // No entry for today, INSERT a brand new one with login_time
                const insertLoginSql = `
                    INSERT INTO ${xtable} (user_id, entry_date, login_time)
                    VALUES (?, ?, ?);
                `;
                await db.query(insertLoginSql, [userId, today_date_str, now_datetime_str]);
                console.log(`User ${userId} logged in for the first time today.`);
            }

            const retdata = { success: true, time: now_datetime_str, msg: 'Login recorded successfully!' };
            return res.status(200).json(retdata);

        }
        // --- Logic for Logout Action (actionType === "2") ---
        else if (actionType === "2") {
            if (!existingEntry || !existingEntry.login_time) {
                // No entry for today, or login_time is NULL (user hasn't logged in yet)
                console.log(`Logout attempt without prior login for user ${userId} on ${today_date_str}.`);
                return res.status(200).json({ // 400 Bad Request indicates an invalid action sequence
                    success: true,
                    msg: 'You must log in first before logging out!',
                    errCode: 'ERR_NO_LOGIN'
                });
            } else if (existingEntry.logout_time) {
                // User has already logged out today
                console.log(`Duplicate logout attempt for user ${userId} on ${today_date_str}.`);
                return res.status(200).json({ // 409 Conflict
                    success: true,
                    msg: `You have already logged out today at ${new Date(existingEntry.logout_time).toLocaleTimeString()}!`,
                    errCode: 'ERR_DUP_LOGOUT'
                });
            } else {
                // All good: User logged in, hasn't logged out yet. UPDATE the existing record.
                const updateLogoutSql = `
                    UPDATE ${xtable}
                    SET logout_time = ?
                    WHERE id = ?;
                `;
                await db.query(updateLogoutSql, [now_datetime_str, existingEntry.id]);
                console.log(`User ${userId} logged out for ${today_date_str}.`);
            }

            const retdata = { success: true, time: now_datetime_str, msg: 'Logout recorded successfully!' };
            return res.status(200).json(retdata);
        }
        // --- Logic for Invalid Action Type ---
        else {
            console.log(`Invalid action type received: ${actionType} for user ${userId}.`);
            return res.status(400).json({
                success: false,
                msg: 'Invalid action type. Expected "1" for login or "2" for logout.',
                errCode: 'ERR_INVALID_ACTION'
            });
        }

    } catch (err) {
        console.error('Error in /timekeep route:', err);
        // This catch block handles unexpected database errors (e.g., connection issues, schema mismatches).
        // If a UNIQUE constraint (like `user_id`, `entry_date`) is violated during the INSERT (which the logic above tries to prevent explicitly)
        // you might still catch ER_DUP_ENTRY (MySQL error code 1062 or SQLSTATE 23000), but the explicit checks should minimize this.
        
        // General server error response
        return res.status(500).json({ success: false, msg: 'DATABASE ERROR, PLEASE TRY AGAIN!!!', errCode: 'ERR_SERVER' });
    }
});

*/
//========login post
router.get('/loginpost/:uid/:pwd/:region', async (req, res) => {
    console.log('firing login with Authenticate====== ', req.params.uid, req.params.pwd, req.params.region, ' ========')

    let  { uid, pwd, region } = req.params;
    let result; // Declare 'result' in a higher scope so it's accessible after the if/else
    let user;   // Declare 'user' here as well, to ensure scope if no user is found
 
	// console.log('Value of region:', region);
	// console.log('Type of region:', typeof region);
	// console.log('Is region truthy?', !!region); // Converts to boolean
	// console.log('Is region.trim() empty?', (region && region.trim() === '')); // Only if region is truthy

	if (typeof region === 'string' && region.toLowerCase() === 'null') {
		region = null; // Convert the string "null" to the actual null value
	}
	// Or handle empty string inputs similarly if they might come as "undefined" string
	if (typeof region === 'string' && region.toLowerCase() === 'undefined') {
		region = undefined;
	}

    try {
         // Check if region is valid
        if (region && region.trim() !== "") {
            //console.log(region, uid);
            const sql = `select * from besi_users_${region} where email=? `;
            result = await db.query(sql, [uid]); // Assign to the already declared 'result'
            //console.log(sql, result[0]);
        } else {
            const sql = `select * from asn_users where email=? and pwd=?`;
            result = await db.query(sql, [uid, pwd]); // Assign to the already declared 'result'
        }

        // db.query typically returns an array like [[rows], [fields]].
        // We need to check if result[0] (the array of rows) exists and has length > 0.
        if (result && result[0] && result[0].length > 0) {
            user = result[0][0]; // Get the first user object from the rows array
            console.log('User found:', user.email, user.region); // Log for debugging

            let aData = [];
            let obj = {
                email: user.email,
                fname: user.full_name.toUpperCase(),
                message: `Welcome!, ${user.full_name.toUpperCase()}!!! `,
                voice: `${user.full_name}!!`,
                grp_id: user.grp_id || user.position_code,
                pic: user.pic || null,
                ip_addy: '',
				besi_id: user.besi_id || null,
				ocw_id: user.ocw_id ||  null,
				jms_id: user.jms_id || null,
                id: user.id,
                region: user.region || region,
                position: user.position || user.position_code,
                found: true
            };
            aData.push(obj);
			console.log(aData)
            return res.status(200).json(aData);
        } else {
            // No user found, or query returned empty array
            console.log('No matching record found for provided credentials.');
            const xdata = [{
                message: "No Matching Record!",
                voice: "No Matching Record!",
                found: false
            }];
            // Use 401 Unauthorized for authentication failure (no matching record)
            return res.status(401).json(xdata);
        }

    } catch (err) {
        // Log the actual error for better debugging
        console.error('Error in Login:', err);

        const xdata = [{
            message: "An unexpected error occurred during login!", // More generic for actual server errors
            voice: "Login Error!",
            found: false
        }];

        // Use 500 Internal Server Error for unexpected errors caught in the try/catch
        return res.status(500).json(xdata);
    }
});


//=== end html routes

//==== GET initial chart data
router.get('/initialchart', async(req,res)=>{
	//return res.status(200).json()
	const retdata = {success:'ok'}
	//get chart data
	getChartData(req, res, retdata )

})

//=== date funcs====
const nuDateMysql=(date)=>{
	const pad=(n)=> n < 10 ? '0' + n : n;
	
	return date.getFullYear()+'-'+
	pad(date.getMonth()+1)+'-'+
	pad(date.getDate())+'-'+
	pad(date.getHours())+':'+
	pad(date.getMinutes())+':'+
	pad(date.getSeconds());
}

const nuDate = () =>{

	//*** USE THIS FOR LOCALHOST NODEJS */

	// const now = new Date()
	// const nuDate = now.toISOString().slice(0,10)
	
	// const localtime = nuDateMysql(now)

	// return[ nuDate, localtime]

	/* === WE USE THIS FOR RENDER.COM VERSION
	*/
	const offset = 8
	const malidate = new Date()
	const tamadate = new Date(malidate.getTime()+offset * 60 * 60 * 1000)
	const nuDate = tamadate.toISOString().slice(0,10)
	
	//const datetimestr = nuDateMysql(tamadate)

	return [nuDate, tamadate]
	
}

//============save LOGIN FIRST====
router.post('/savetologin/:empid', async (req, res) => {
	//console.log('saving to login....', req.body)
	console.log('=========SAVING TO LOGIN()============',req.params.empid)
	
	try {
		const sql = 'INSERT into asn_transaction (emp_id,parcel,transaction_number,created_at,login_time) VALUES(?,?,?,?,?)'
	
		const [datestr, datetimestr] = nuDate()

    	const [rows, fields] = await db.query(sql, [ 
					parseInt(req.params.empid), 
					parseInt(req.body.f_parcel), 
					req.body.transnumber, 
					datestr,
					datetimestr
				]);

		const retdata = {success:'ok'} 
		//get chart data
		getChartData(req, res, retdata )

		console.log("SAVING LOGIN gettingchart data")

	} catch (err) {
		console.error('Error:', err);

		if(err.code === 'ER_DUP_ENTRY'){
			return res.status(200).json({success:'fail',msg:'YOU ALREADY HAVE A DATA SAVED FOR TODAY!!!'})
		//return res.status(500).json({error:"error!"})
		}else{
			return res.status(200).json({success:'fail',msg:'DATABASE ERROR, PLEASE TRY AGAIN!!!'})
		}
		
	}

})
//===========END LOGIN SAVE====

//=============ADD RIDER TRANSACTION J&T GRP====//
router.post('/savetransaction/:empid', async (req, res) => {
	//console.log('==SAVE TRANSACTION INFO',req.body)
	console.log('=========SAVE TRANSACTION INFO========',req.params.empid,', ',req.body.ff_transnumber)
	
 	try {
		const [datestr, datetimestr] = nuDate()

		const sql = ` UPDATE asn_transaction 
			SET 
			parcel=?,
			actual_parcel =?, 
			amount = ?, 
			actual_amount = ?, 
			remarks = ? ,
			logout_time = ?
			WHERE emp_id = ?
			and transaction_number = ? `

		const escapedText = req.body.ff_remarks.replace(/\r\n|\r|\n/g, ','); // Replace all newline variations with <br>
					
		const [rows, fields] = await db.query(sql , [	
					parseInt(req.body.x_parcel),
					parseInt(req.body.ff_parcel),
					parseFloat(req.body.f_amount), 
					parseFloat(req.body.ff_amount), 
					escapedText	,
					datetimestr,
					parseInt(req.params.empid),
					req.body.ff_transnumber
				]);

		const retdata = {
			message: "Transaction added Successfully!",
			voice:"Transaction Added Successfully!",
			status:true
		}

		//get chart data
		getChartData(req, res, retdata )

	} catch (err) {
		console.error("UPDATE INSERT error", err);
		//results[0]
		return res.status(200).json({						
			status:false
		})	
	
	}
 
})

//=============END ADD RIDER TRANSACTION J&T GRP====//
//===get chart data
const getChartData = async(req,res, retdata) =>{

	try {

		const [datestr, datetimestr] = nuDate()
		
		//=== GET REALTIME DATA========
		sql = `SELECT 
			a.region,
			count(c.xname) as reg,
			count(b.emp_id) as logged,
			COALESCE(CAST(round( count(b.emp_id)  / count(c.xname) *100,0) AS SIGNED),0)  as attendance_pct,
			COALESCE(CAST(round(SUM(b.parcel),0)AS SIGNED),0) AS parcel,
			COALESCE(CAST(round(SUM(b.actual_parcel),0)AS SIGNED), 0) AS parcel_delivered,
			COALESCE(round(SUM(b.amount),2), 0) AS amount,
			COALESCE(round(SUM(b.actual_amount),2), 0) AS amount_remitted,
			COALESCE(CAST(round( SUM(b.actual_parcel) / SUM(b.parcel)*100,0)AS SIGNED),0) as qty_pct
			FROM asn_hub a
			LEFT JOIN asn_users c 
			ON c.hub = a.hub
			LEFT JOIN asn_transaction b 
			ON b.emp_id = c.id
			and b.created_at = '${datestr}' 
			and c.grp_id = 1 and c.active = 1  
			GROUP BY a.region 
			ORDER by a.region;`

		const [result, fields] = await db.query(sql);
		
		res.status(200).json( { success:'ok',data:result} )


	} catch (err) {
		console.error("get data error getchartdata()", err);
		//results[0].
		return res.send(500).json({						
			error:err
		})
	}


}//end func

//===socket emit
const sendSocket = (xdata) => {
	io.emit('potek', xdata)
	console.log('io.emit sakses',xdata)
}


//===== piechart for rider====// 
router.get('/getpiedata/:empid', async(req,res)=>{
	try {

		var series = new Date() 
		var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
		var yyyy = series.getFullYear()

		series = yyyy+'-'+mm
		
		console.log('/getpiedata()')
		
		const sql =`select 
			round( ( sum(actual_parcel) / sum(parcel) )   * 100 ) as delivered_pct,
			round( 100 - ( sum(actual_parcel) / sum(parcel) ) * 100 ) as undelivered_pct,
			created_at,
			emp_id
			from asn_transaction
			where SUBSTRING(created_at,1,7) like '${series}%' 
			and emp_id ='${req.params.empid}' `
	
		const [results, fields] = await db.query( sql );
		
		res.status(200).json({data:results})

	} catch (err) {
		console.error('Error:', err);
		res.status(500).send('Error occurred');
	}

})
//===== end piechart for rider====//

//===test menu-submenu array->json--->
router.get('/xmenu/:grpid', async(req,res)=>{
	connectDb()
    .then((db)=>{ 

		sql2 =`SELECT 
			grp_id,
			menu, menu_icon,
			JSON_ARRAYAGG(
						JSON_OBJECT(
							'sub', submenu,
							'icon', submenu_icon
						)
					) AS list
			FROM asn_menu 
			WHERE grp_id = ${req.params.grpid}`

		//console.log(sql)
		console.log(sql2)

		db.query( sql2 , null , (error, results)=>{
			console.log( error,results )
		})

	}).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 

})

//===test menu-submenu array->json--->
router.get('/menu/:grpid', async(req,res)=>{

	try {
		sql = `SELECT menu,
			menu_icon,
			grouplist, 
			JSON_ARRAYAGG( 
			JSON_OBJECT( 'sub', submenu, 'icon', submenu_icon, 'href', href )) AS list 
			FROM asn_menu 
			WHERE FIND_IN_SET('${req.params.grpid}', grouplist)> 0 
			GROUP BY menu 
			ORDER BY sequence;`
		
		const [results, fields] = await db.query(sql);
		
		res.status(200).json( results )

	} catch (err) {
		console.error('Error:', err);
		res.status(500).send('Error occurred');
	}

})


//==== for grid monthly transaction riders =======//
router.get('/gridmonthlytransaction/:empid', async(req,res)=>{

	let connection;
	var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	const xseries = yyyy+'-'+mm +'-01'
	const series2 = yyyy+'-'+mm

	if(typeof req.params.empid === 'undefined'){
		return res.status(500).json({error:'Error! Please Try Again!'})
	}

	try {
		// Get a connection from the pool
		connection = await db.getConnection();

		// Set your SQL statements
		sql = `
			select DATE_FORMAT(a.Dates,'%Y-%m-%d') as Dates
			from ( select last_day('${xseries}') - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY as Dates
			from (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as a cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as b cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as c ) a
			where a.Dates between '${xseries}' and last_day('${xseries}') order by a.Dates`

		sql2 =`SELECT id,emp_id,
				transaction_number,
				sum(parcel) as parcel,
				sum(actual_parcel) as actual_parcel,
				sum(amount) as amount,
				sum(actual_amount) as actual_amount,
				remarks,
				DATE_FORMAT(created_at,'%Y-%m-%d') as created_at
				FROM asn_transaction
				WHERE SUBSTRING(created_at,1,7) like '${series2}%' 
				and emp_id =${req.params.empid} 
				GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d') `	 

		// Execute the queries
		const [results] = await connection.query(`${sql}; ${sql2}`, [null, null]);

		// Process results
		const results0 = results[0];
		const results1 = results[1];

		for (let zkey in results0) {
			try {
				const transIdx = results1.findIndex(x => x.created_at === results0[zkey].Dates);
				results0[zkey].Dates = `${results0[zkey].Dates}`;

				if (transIdx < 0) {
					// no record
					results0[zkey].parcel = 0;
					results0[zkey].delivered = 0;
					results0[zkey].total_amount = 0;
					results0[zkey].amount_remitted = 0;
					results0[zkey].remarks = "";
				} else {
					results0[zkey].parcel = results1[transIdx].parcel;
					results0[zkey].delivered = `${results1[transIdx].actual_parcel}`;
					results0[zkey].total_amount = parseFloat(results1[transIdx].amount);
					results0[zkey].amount_remitted = parseFloat(results1[transIdx].actual_amount);
					results0[zkey].remarks = results1[transIdx].remarks;
				}
			} catch (innerErr) {
				// handle processing errors
				throw innerErr; // propagate
			}
		}

		// Done, send response
		res.status(200).json(results0);
		
	} catch (err) {
		console.error('Error in route:', err);
		res.status(500).json({ error: 'Server Error' });
	} finally {
		if (connection) {
		connection.release(); // release back to pool
		}
	}
})

//============= get monthly transaction riders =======//
router.get('/getmonthlytransaction/:empid', async(req,res)=>{
	var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	series = yyyy+'-'+mm +'-01'
	const series2 = yyyy+'-'+mm

	//console.log( 'series2 ',series2 )

	let sql, sql2

	connectDb()
    .then((db)=>{ 

		//====take-out comma after sql statement it will error if multiple statements is set to true
		//DATE_FORMAT(a.Dates,'%d-%b %Y, %a') as Dates
		sql = `
			select DATE_FORMAT(a.Dates,'%Y-%m-%d') as Dates
			from ( select last_day('${series}') - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY as Dates
			from (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as a cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as b cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as c ) a
			where a.Dates between '${series}' and last_day('${series}') order by a.Dates`

		sql2 =`SELECT * from
				where SUBSTRING(created_at,1,7) like '${series2}%' 
				and emp_id ='${req.params.empid}' `	

		//console.log(sql)
		//console.log(sql2)
		
		let xtable = `
			<table class="table"> 
			<thead>
				<tr>
				<th>Date</th>
				<th>Parcel</th>
				<th>Delivered>
				<th>Total Amount</th>
				<th>Amount Remitted</th>
				<th>Remarks</th>
				</tr>
			</thead>
			<tbody>`

		db.query( `${sql}; ${sql2}`, [null, null], (error, results)=>{

		console.log(results[0],results[1])
			let trans, tick

			for(let zkey in results[0]){

				trans = results[1].findIndex( x => x.created_at === results[0][zkey].Dates)

				if(trans<0){ //no record
					tick= null
				}else{
					if( parseInt(results[1][trans].parcel) > parseInt(results[1][trans].actual_parcel) ){
						tick=`<i class="ti ti-arrow-down-right text-danger"></i>&nbsp;${results[1][trans].actual_parcel}`
					}else{
						tick= results[1][trans].actual_parcel
					}
					
				}//eif
				

				xtable+= `<tr>
				<td>${results[0][zkey].Dates}&nbsp;${(trans>=0 ? '<i style="color:green;font-size:15px;" class="ti ti-check"></i>': '<i style="color:red;font-size:11px;" class="ti ti-x"></i>')}</td>
				<td >${(trans>=0 ? results[1][trans].parcel : '&nbsp;')}</td>
				<td >${(trans>=0 ? tick : '&nbsp;')}</td>
				<td >${(trans>=0 ? results[1][trans].amount : '&nbsp;')}</td>
				<td >${(trans>=0 ? results[1][trans].actual_amount : '&nbsp;')}</td>
				<td >${(trans>=0 ? results[1][trans].remarks : '&nbsp;')}</td>
				<tr>`

			}//endfor

			xtable+=	
			`</tbody>
			</table>`

			closeDb(db);//CLOSE connection
			//console.log(xtable)
			res.status(200).send(xtable)
		})
	
	}).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 
})
//============= end get monthly transaction riders =====//

//======================ADD NEW EMPLOYEE ====================
// Create a new employee (CREATE)
let myfile
router.post('/newemppost/', async (req, res) => {
    //const { employeeId, full_name, email, phone, birth_date, hire_date, job_title, department, employment_status, address } = req.body;

	myfile = req.body.employeeId
	console.log('data is', req.body.fullName.toUpperCase(), req.body.birthDate , req.body.jobTitle)
	
   	connectDb()
    .then((db)=>{

	//$sql = `INSERT INTO asn_employees (emp_id, full_name, email, phone, birth_date, hire_date, job_title, department, employment_status, address) 
	//VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`
	
			
		$sql = `INSERT INTO asn_employees (emp_id, full_name, email, phone, birth_date, hire_date, job_title, department, employment_status, address) 
		VALUES (?,?,?,?,?,?,?,?,?,?) `
			
		db.query( $sql,
			[	req.body.employeeId, 
				req.body.fullName.toUpperCase(), 
				req.body.email, 
				req.body.phone, 
				req.body.birthDate, 
				req.body.hireDate, 
				req.body.jobTitle,
				req.body.department, 
				req.body.employmentStatus, 
				req.body.address ],
			(error,result)=>{
				console.log('inserting..',result.rowCount)

				//results[0]
				res.json({
					message: "Employee Number " + myfile +" Added Successfully!",
					voice:"Employee Number " + myfile +" Added Successfully!",
					approve_voice:`You have another item added in Inventory`,
					status:true
				})
	
				closeDb(db);//CLOSE connection
			
		})
		
    }).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 
});

//==============busboy, basic-ftp  for file uploading============
const Busboy = require('busboy')
const {Client} = require("basic-ftp")

//================ post image ==================//
router.post('/postimage/:transnumber',   async (req, res) => {
	console.log('===FIRING /postimage===', req.params.transnumber )

	const busboy = Busboy({ headers: req.headers });
		
	busboy.on('file', function(fieldname, file, filename) {

		console.log( 'firing busboy on file() ==', filename, fieldname, path.extname( filename.filename) )
		
		let extname

		if( path.extname(filename.filename) ===".jpg" ||  path.extname(filename.filename) ==='.jpeg' ||  path.extname(filename.filename) ==='.png' ||  path.extname(filename.filename) ==='.gif'){
			extname = ".jpg"
		}else{
			extname = path.extname(filename.filename)
		} 
		
		// fieldname is 'fileUpload'
		//var fstream = fs.createWriteStream('ASN-'+ filename + extname);
		var fstream = fs.createWriteStream(`${req.params.transnumber}` + extname);

		file.pipe(fstream);
			
		console.log( 'Writing Stream... ', fstream.path )

		file.resume()

		fstream.on('close', function () {
			console.log('Closing Stream, Trying to Up load...')

			console.log('Compacting file size.... ')

			var xfile = 'A_'+fstream.path

			sharp( fstream.path ).resize({width:500}).jpeg({ quality: 30 }).toFile(xfile, async(err,info)=>{

				//console.log(err,'?')
				if(!err){

					const client = new Client()
					//client.ftp.verbose = true

					try{
						await client.access({
							host: "ftp.asianowapp.com",
							user: "u899193124.0811carlo",
							password: "u899193124.Asn",
						})

						client.trackProgress(info => {
							console.log("file", info.name)
							console.log("transferred overall", info.bytesOverall)
						})

						await client.uploadFrom(xfile, xfile)

						fs.unlink( xfile,()=>{
							console.log('===Delete temp file on Hostinger==== ', xfile )
	
							fs.unlink( fstream.path ,()=>{
								console.log('===Delete temp file on Hostinger==== ', fstream.path )
								return res.status(200).send({ status: true });	
							})	
	
						})

					}
					catch(err){
						console.log(err)
					}

					client.close()
				
				
				}//eif err

			}) //end sharp

		})//====end fstream
	})//===end busboy on file 
	
	busboy.on('finish',()=>{
		console.log('busboy finish')
	}) //busboy on finish

	//write file
	req.pipe(busboy)
	
}) //==============end post image =============//

//==============busboy, scp2  for file uploading============

router.post('/uploadpdf',  async(req, res)=>{

	console.log('===FIRING uploadpdf()===')

	const busboy = Busboy({ headers: req.headers });
		
	busboy.on('file', function(fieldname, file, filename) {
		console.log( 'firing busboy on file() ==', mycookie,filename)

		// fieldname is 'fileUpload'
		var fstream = fs.createWriteStream(mycookie +'.pdf');
		
		file.pipe(fstream)
			
		console.log( 'Writing Stream... ', fstream.path )

		file.resume()

		fstream.on('close', function () {
			console.log('Closing Stream, Trying to Up load...')
			ftpclient.scp(fstream.path, {
				host: "gator3142.hostgator.com", //--this is orig ->process.env.FTPHOST,
				//port: 3331, // defaults to 21
				username: "vantazti", // this is orig-> process.env.FTPUSER, // defaults to "anonymous"
				password: "2Timothy@1:9_10",
				path: 'public_html/osndp/'
			}, function(err) {
				console.log("File Uploaded!!!");
				
				//==delete file
				fs.unlink( fstream.path,()=>{
					console.log('Delete temp file ', fstream.path)
					res.status(200).send({ success: true });
				})

			})
			
		}); 
	});
	
	busboy.on('finish',()=>{
		console.log('busboy.on.finish() DONE!==')
	}) //busboy on finish

	//write file
	req.pipe(busboy)
		
})//==end upload

const csvParser = require('csv-parser');

//=== FINAL FOR CLAIMS
router.post('/claims', async( req, res) => {
	console.log('===FIRING /claims===')

	const busboy = Busboy({ headers: req.headers });
		
	busboy.on('file', function(fieldname, file, filename) {

		console.log( 'firing busboy on Excel file() ==', filename, fieldname, path.extname( filename.filename) )
		
		let extname

		if( path.extname(filename.filename) ===".csv"  ){
			extname = ".csv"
		}else{
			extname = path.extname(filename.filename)
		}

		const final_file =`ASN-${getRandomPin('0123456789',4)}.csv`
		
		// fieldname is 'fileUpload'
		var fstream = fs.createWriteStream( final_file );
		
		file.pipe(fstream);
			
		console.log( 'Writing Excel file Stream... ', fstream.path )

		file.resume()

		fstream.on('close', async function () {
			console.log('Closing Stream, Trying to Up load to POSTGRES...')
			
			const dbconfig  ={
                host: 'srv1759.hstgr.io',
                user: 'u899193124_asianow',
                password: 'g12@c3M312c4',
                database: 'u899193124_asianow'
            }
			const conn = await mysqls.createConnection(dbconfig);

			//console.log(conn)
			fs.createReadStream(fstream.path)
				.pipe(csvParser())
				.on('data', async(row)=>{
					//console.log('this is row',row)
					const { batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, amt } = row ;
					const query = `INSERT INTO asn_claims (batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, amount) 
								VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
					//console.log( query ,batch_id,emp_id,full_name)
					
					await conn.execute( query , [batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, amt])
					//await conn.end()							
				})
				.on('end', async()=>{
					fs.unlinkSync(fstream.path); // Remove the file after processing
					
					await conn.end()

			 		console.log('CLOSING STREAM.. CSV UPLOADED SUCCESSFULLY!')
			 		return res.status(200).json({message:'Claims Upload Successfully!',status:true})
				})
				.on('error',(err)=>{
					console.log('Error processing csv')
					res.status(500).send('Error processing csv')
				})

		})//====end fstream
	})//===end busboy on file 
	
	busboy.on('finish',()=>{
		console.log('busboy finish')
	}) //busboy on finish

	//write file
	req.pipe(busboy)
	
})

//===========BULK INSERT CSV================
router.get('/copy-data', async (req, res) => {
	try {
		// You need to have a CSV file available to copy from
		const filePath = '/path/to/your/file.csv';
		
		// You can read the file and use COPY FROM STDIN method
		const client = await pool.connect();
		const query = `COPY your_table FROM STDIN WITH (FORMAT csv)`;

		const stream = client.query(copyFrom(query));
		const fileStream = fs.createReadStream(filePath);

		fileStream.on('error', (error) => {
		console.error('File stream error:', error);
		res.status(500).send('Error reading the file');
		});

		stream.on('end', () => {
		client.release();
		res.status(200).send('Data copied successfully');
		});

		stream.on('error', (error) => {
		client.release();
		console.error('Database stream error:', error);
		res.status(500).send('Error copying data');
		});

		fileStream.pipe(stream);

	} catch (error) {
		console.error('Error in /copy-data:', error);
		res.status(500).send('Error processing request');
	}
});

//============END BULK INSERT CSV ===========

//=================function getting drnumber ======//
const drseq = () => {
	var today = new Date() 
	var dd = String(today.getDate()).padStart(2, '0')
	var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = today.getFullYear()

	today = yyyy+ mm +dd

	const sqlu = "update dr_seq set sequence = sequence +1;"
	connectDb()
	.then((db)=>{
		db.query(sqlu , null ,(error,results) => {	
			//console.log('UPDATE DR SEQ', results)
		})
	})

	return today
}

//=====https://localhost:3000/q/6/2 
router.get('/getlistpdf/:limit/:page', async(req,res) => {
	
	console.log(`firing getlistpdf/${req.params.limit}/${req.params.page}`)

	const limit_num = 30 //take out Mar 27,2025 req.params.limit, make a hard value of 30
	let nStart = 0	
	let page = req.params.page
	
	connectDb() 
	.then((db)=>{
		
		let sql = `SELECT distinct(a.emp_id) as emp_id,
		a.full_name as rider,
		round(sum( a.amount )) as total,
        a.hubs_location as hub,
        (select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
		from asn_claims a 
        group by a.emp_id,a.pdf_batch
		HAVING a.pdf_batch like 'ASN%'
		order by a.pdf_batch asc; `
		
		//console.log(sql)
		
		let reccount = 0
		
		db.query( `${sql}`,null,(err,xresult)=>{
			
			if(!xresult){
				res.send("<span class='text-primary'>** No Data Found!!!**</span>")
			}else{

				reccount = xresult.length
				//==== for next
				let aPage = []
				let pages = Math.ceil( xresult.length / limit_num )
				
				nStart = 0
				
				for (let i = 0; i < pages; i++) {
					aPage.push(nStart)
					nStart += parseInt(limit_num)
				}//==next
				
				//console.log('offset ',aPage)
				//===get from json field 
				let sql2 = 
					`SELECT distinct(a.emp_id) as emp_id,
					a.full_name as rider,
					round(sum( a.amount )) as total,
					a.hubs_location as hub,
					a.pdf_batch,
					(select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
					from asn_claims a 
					group by a.emp_id, a.pdf_batch
					HAVING a.pdf_batch like 'ASN%'
					order by a.pdf_batch asc
					LIMIT ${limit_num} OFFSET ${aPage[page-1]};`
				
				//onsole.log(sql2)
				

				db.query(`${sql2}`,null,(err,xdata)=>{
				
					let  xtable =
					`<div class="col-lg-8">
					<table class="table"> 
					<thead>
						<tr>
						<th>Rider</th>
						<th>Pdf Batch</th>
						<th align=right>Amount</th>
						</tr>
					</thead>
					<tbody>`

					
					let randpct, issues

					for (let zkey in xdata){

						randpct = Math.floor((Math.random() * 100) + 1);
						issues  = Math.floor((Math.random() * 15) + 1);
						//let randpct2 = (100-randpct)y
						//taken out <td>${data.rows[ikey].id}</td>
						
						xtable += `<tr>
						<td>
						${ xdata[zkey].rider}<br>
						${ xdata[zkey].emp_id}<br>
						( ${ xdata[zkey].region}, ${ xdata[zkey].hub} )<br> 
						</td>
						<td> ${ xdata[zkey].pdf_batch} </td>
						<td align='right' valign='bottom'><b>${addCommas(parseFloat( xdata[zkey].total).toFixed(2))}</b></td>
						</tr>`
					}//=======end for
					
					
					//console.log( xtable )
					let xprev = ((page-1)>0?'':'disabled')
					let xnext = ((page>=pages)?'disabled':'')
					let mypagination = "", main = "", xclass = ""
					//===mypagination is for pagination
					
					//===final pagination
					mypagination+=`
					<nav aria-label="Page navigation example">
					  <ul class="pagination">`
					
					//==== previous link
					mypagination += `<li class="page-item ${xprev}">
					<a class="page-link" href="javascript:asn.getListPdf(${parseInt(req.params.page)-1 })">Previous</a></li>`
					
					for(let x=0; x < pages; x++){
						
						if( req.params.page==(x+1)){
							xclass = "disabled"
						}else{
							xclass = ""
						}
						//==== number page
						mypagination += `<li class="page-item ${xclass}">
						<a class="page-link"  href="javascript:asn.getListPdf(${x+1})">${x+1}</a></li>`
						
					}//end for
					
					//=======next link
					mypagination += `<li class="page-item ${xnext}">
					<a class="page-link" href="javascript:asn.getListPdf(${parseInt(req.params.page)+1})">Next</a></li>`
					
					mypagination+=`
					</ul>
					</nav>`
					
					//=== if u add column in tables
					// === add also colspan=??
					xtable += `
						<tr>
						<td colspan=4 align='center'>
						 ${mypagination}<div id='reccount' style='visibility:hidden' >${reccount}</div>
						</td>
						</tr>
						</TBODY>
					</table>
					</div>`
					
					main +=`${xtable}`
							
					aPage.length = 0 //reset array
					
					closeDb(db)

					//console.log( main )
					res.send(main) //output result
				})//endquery
								
			}//eif 
		
		})//==end db.query 
		
	}).catch((error)=>{
		res.status(500).json({error:'No Fetch Docs'})
	})		

})//end pagination


const pdfBatch =  ( emp_id ) =>{
	return new Promise((resolve, reject)=> {
		const sql = `Select sequence from asn_pdf_sequence;`
		let xcode, seq
	
		connectDb()
		.then((db)=>{
			db.query(`${sql}`,(error,results) => {
				if(results.length>0){
					
					seq = results[0].sequence+1
					//console.log(results,seq)
					//console.log( seq.toString().padStart(5,"0") )
					const usql = `update asn_pdf_sequence set sequence = ${seq}`
					
					db.query(`${usql}`,(error,udata) => {
					})
	
					xcode =`ASN-${seq.toString().padStart(5,"0")}`

					
				}
	
				closeDb(db)
				//console.log(xcode)
				resolve( xcode )
				
			})
		}).catch((error)=>{
			reject(error)
			res.status(500).json({error:'Error'})
		})
	})

	
}

router.get('/pdfx', async(req,res)=>{
	
	 let xxx =  await pdfBatch('205214')
	console.log('serial',xxx)
	res.status(200).json({status:'ok'})
})


//======= CHECK PDF FIRST BEFORE CREATING ==============
router.get('/checkpdf/:e_num/:grp_id', async(req, res)=>{

	//console.log(req.params.grp_id)

	if( req.params.grp_id!=="2"){ //if the one checking is not ARE COORDINATOR allow to re-print/download pdf
		const sql = `Select emp_id,pdf_batch from asn_claims
			where emp_id='${req.params.e_num}' 
			order by emp_id`

		connectDb()
		.then((db)=>{
			db.query(`${sql}`,async(error,results) => {	
				if(results.length > 0){
					console.log('OK TO REPRINT')
					
					closeDb(db) //close
					res.status(200).json({status:true, batch:`${results[0].pdf_batch}`})
				}
			})

		}).catch((error)=>{
			res.status(500).json({error:'Error'})
		}) 

	}else{

		const sql = `Select emp_id,pdf_batch from asn_claims
			where emp_id='${req.params.e_num}' and
			pdf_batch <> ''
			order by emp_id`

		connectDb()
		.then((db)=>{
			db.query(`${sql}`,async(error,results) => {	
				if(results.length > 0){
					console.log('FOUND!')
					
					closeDb(db) //close

					res.status(200).json({status:false, batch: results[0].pdf_batch})
				}else{
					const seq = await pdfBatch( req.params.e_num)

					const sql2 = `UPDATE asn_claims SET pdf_batch ='${seq}'
								where emp_id='${req.params.e_num}'`
					
					console.log(sql2)	

					db.query(sql2, null, (error,xdata) => {
						///console.log(xdata) xdata.affectedRows or changedRows
					})

					console.log('UPDATED DATABASE WITH PDFBATCH() GOOD TO DOWNLOAD!')
					
					closeDb(db)
					res.status(200).json({status:true, batch:`${seq}`})
					
				}
			})

		}).catch((error)=>{
			res.status(500).json({error:'Error'})
		}) 

	}//eif
	
	

})

//======= CREATE PDF
router.get('/createpdf/:e_num/:batch', async(req, res)=>{

	console.log('===createpdf()====', req.params.e_num)
	const sql = `SELECT distinct(emp_id) as emp_id,
	full_name as rider,
	category,
	hubs_location as hub, 
	track_number as track,
	claims_reason as reason,
	sum( amount ) as total from asn_claims
	group by full_name,emp_id,category,hubs_location, track_number,claims_reason
	having emp_id='${req.params.e_num}'
	order by full_name`

	//console.log(sql )

	connectDb()
	.then((db)=>{
		db.query(`${sql}`,(error,results) => {	
		
			if ( results.length == 0) {   //data = array 
				console.log('no rec')
				closeDb(db);//CLOSE connection
		
				res.status(500).send('** No Record Yet! ***')
		
			}else{ 
			
				let xdata = []

				xdata = results //get result in array
				const curr_date = strdates()

				let total_amt = 0
				for(let zkey in results){
					
					total_amt+=parseFloat(results[zkey].total)
					results[zkey].total= parseFloat(results[zkey].total).toFixed(2) //change to decimal first
					 
				}//endfor

				let nFormatTotal = addCommas(parseFloat(total_amt).toFixed(2))
				let nTotal = parseFloat(total_amt).toFixed(2)

				//=== CREATE MEDRX ===========
				asnpdf.reportpdf( xdata, curr_date,  nFormatTotal, nTotal, req.params.batch)
				.then( reportfile =>{
					console.log('REPORT PDF SUCCESS!', reportfile)
					
					//============ force download
					res.download( reportfile, reportfile,(err)=>{
						console.log('==downloading pdf===')
						if(err){
							console.error('Error in Downloading ',reportfile,err)

							closeDb(db)

							res.status(500).send(`Error in Downloading ${reportfile}`)
						}else{

							closeDb(db)
							
						}
					}) //===end res.download
				})
			}//eif
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 
})

//====== CLEANUP PDF
router.get('/deletepdf/:e_num', async(req, res) => {

	let reportfile = `ADT_${req.params.e_num}.pdf`

 	Utils.deletePdf(reportfile)
	.then(x => {
		if(x){
			
			//=== RETURN RESULT ===//
			console.log('*** Deleted temp file ', reportfile)
			
			//update patient record
			//closeDb(db)
			res.status(200).json({status:true})

		}//eif
	})
})//end Utils.deletepdfse{



//============SAVE J&T LINK WHEN SCANNED===//
router.post('/addlink', async(req,res)=>{
	sql = `INSERT INTO asn_jtlink (link) 
		VALUES (?) `
	
	console.log(sql)

	connectDb()
	.then((db)=>{
		db.query( sql,	[req.body.link ],	(error,result)=>{
				console.log('inserting j&T link..',result)

				//results[0]
				res.json({
					message: "Link added Successfully!",
					status:true
				})
	
				closeDb(db);//CLOSE connection
			
		})
	})	
})


router.get('/getzap/:eqptid', async(req,res)=>{
	sql = `DELETE from equipment
	where equipment_id = '${req.params.eqptid}'`

	connectDb()
	.then((db)=>{
	
		db.query(sql, null ,(error,data) => {	
			if ( data.length  == 0) {   //data = array 
				console.log('no rec')
				
				closeDb(db);//CLOSE connection
				//console.log("===MYSQL CONNECTON CLOSED SUCCESSFULLY===")


			}else{

				res.status(200).json({ status : true, voice:'Equipment Deleted Successfully', message:'Equipment Deleted Successfully' })			
			}//eif
			closeDb( db )
		}) //end db.query 
	})//tne .then(db)
	
})


const bcrypt = require("bcrypt")
const saltRounds = 10
//======== END NODEJS CORS SETTING
const getRandomPin = (chars, len)=>[...Array(len)].map(
    (i)=>chars[Math.floor(Math.random()*chars.length)]
).join('');


//==========SEND OTP
router.get( '/sendotp/:email/:name', async (req,res)=>{
	
	const otp = getRandomPin('0123456789',6)
	
	bcrypt
	.hash( otp, saltRounds)
	.then(hash => {

		axios.get(`https://vantaztic.com/vanz/mailotp.php?otp=${otp}&name=${req.params.name}&email=${req.params.email}`)
		.then((response) => {
			if (response.status === 200) {
				const html = response.data;
				//mail the otp
				console.log(`https://vantaztic.com/vanz/mailotp.php?otp=${otp}&name=${req.params.name}&email=${req.params.email}`)
				console.log('axios otp/ ', otp, ' ===Hash== ', hash)
				
				//save the otp to db
				let sqlu = `UPDATE vantaztic_users SET private_key='${hash}'
				WHERE email ='${req.params.email}' `
			
				connectDb()
				.then((db)=>{
			
					db.query(sqlu,(error,results) => {	
						console.log('otp update==', sqlu, results.changedRows)
					})
					
					closeDb(db);//CLOSE connection
			

				}).catch((error)=>{
					res.status(500).json({error:'Error'})
				})
				
				res.json({
					status:true
				})	

				
			}
		})
		.catch((err) => {
			throw new Error(err);
		});
	  	
	})
	.catch(err => console.error(err.message))
	
})
 
//===== GET OTP AND COMPARE
router.get( '/getotp/:otp/:email', async (req,res)=>{
	sql = `select private_key from vantaztic_users where email = '${req.params.email}'`
	connectDb()
	.then((db)=>{

		db.query(sql,null, (err,results) => {	
			
			//console.log('inquire data', data, sql )
			
			if(results.length>0){
				//console.log('inquire data', results )
				
				bcrypt
				.compare( req.params.otp, results[0].private_key)
				.then(xres => {
					console.log('OTP Matched?: ',xres) // return true
					
					res.json({
						status:xres
					})
	
				})
				.catch(err => console.error(err.message))			
			}else{
				res.json({
					status:false
				})

			}
		})
		
		closeDb(db);//CLOSE connection


	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	})

})

 
const smsPost = (msgbody) => {
	//number : '09175761186,09985524618,09611164983',
	console.log('***SENDING SMS*** ', msgbody)
	let smsdata = {
		apikey : '20dc879ad17ec2b41ec0dba928b28a69', //Your API KEY
		number : '09611164983',			
		message : msgbody,
		sendername : 'SEMAPHORE'
    }
	
	fetcher('https://semaphore.co/api/v4/messages', {
		method: 'POST',
		body: JSON.stringify(smsdata),
		headers: { 'Content-Type': 'application/json' }
	})   
	.then(res => res.json() )
    .then(json => console.log ('sms ->', json ))
	
}

//========add comma for currency
const addCommas = (nStr) => {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}


const getDate = () =>{
	let today = new Date()
	var dd = String(today.getDate()).padStart(2,'0')
	var mm = String(today.getMonth()+1).padStart(2,'0')
	var yyyy = today.getFullYear()

	today = mm +'/'+dd+'/'+yyyy
	return today
} 

const nugetDate = () =>{
	let today = new Date()
	var dd = String(today.getDate()).padStart(2,'0')
	var mm = String(today.getMonth()+1).padStart(2,'0')
	var yyyy = today.getFullYear()

	today =yyyy+'-'+mm +'-'+dd

	return today
}

const strdates = () =>{
	let today = new Date()
	var dd = String(today.getDate()).padStart(2,'0')
	var mm = String(today.getMonth()+1).padStart(2,'0')
	var yyyy = today.getFullYear()
	var mos = new Date(`${today.getMonth()+1}/${dd}/${yyyy}`).toLocaleString('en-PH',{month:'long'})

	today = mos + ' '+ dd +', '+yyyy
	return today
}


//======sample pagination
//=====https://localhost:3000/q/6/2 
router.get('/q/:limit/:page',  async(req,res) => {
	
	const limit_num = req.params.limit
	let nStart = 0
	let page = req.params.page
	
	connectDb()
	.then((db)=>{
		
		sql1 = `select * from equipment_client`
							
		db.query(sql1,null,(err,data)=>{
			
			if(data.length==0){
			}else{
				//==== for next
				let aPage = []
				let pages = Math.ceil( data.length / limit_num )
				
				nStart = 0
				
				for (let i = 0; i < pages; i++) {
					aPage.push(nStart)
					nStart += parseInt(limit_num)
				}//==next
				
				console.log('offset ',aPage)
				sql2 = `select * from equipment_client 
						LIMIT ${limit_num} OFFSET ${aPage[page-1]}`
				console.log(sql2)
				
				db.query(`select * from equipment_client 
						LIMIT ${limit_num} OFFSET ${aPage[page-1]}`,null,(err,data)=>{
					
					let mytable = `
							<table class="table p-3 table-striped table-hover">
							<thead>
								<tr>
								  <th scope="col">ID</th>
								  <th scope="col">PO</th>
								  <th scope="col">TRANSACTION</th>
								</tr>
							</thead>
							<tbody>`
							
					for (let ikey in data){
						mytable += `<tr>
							<td>${data[ikey].id}</td>
							<td>${data[ikey].po_number }</td>
							<td>${data[ikey].transaction }</td>
						</tr>`
					}//=======end for
					
					let xprev = ((page-1)>0?'':'disabled')
					let xnext = ((page>=pages)?'disabled':'')
					let mypagination = "", main = "", xclass = ""
					//===mypagination is for pagination
					
					//===final pagination
					mypagination+=`
					<nav aria-label="Page navigation example">
					  <ul class="pagination">`
					
					//$xprev
					mypagination += `<li class="page-item ${xprev}"><a class="page-link" href="${parseInt(req.params.page)-1 }">Previous</a></li>`
					
					for(let x=0; x < pages; x++){
						if(req.params.page==(x+1)){
							xclass = " active"
						}else{
							xclass = ""
						}
						mypagination += `<li class="page-item"><a class="page-link ${xclass}" href="${x+1}">${x+1}</a></li>`
					}//end for
					
					mypagination += `<li class="page-item ${xnext}"><a class="page-link" href="${parseInt(req.params.page)+1}">Next</a></li>`
					
					mypagination+=`
					</ul>
					</nav>`
					
					mytable += `
						<tr>
						<td colspan=3 align='center'>
						 ${mypagination}
						</td>
						</tr>
						</TBODY>
					</table>`
					
					main +=`
					<!doctype html>
					<html lang="en">
					  <head>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<title>Bootstrap demo</title>
						<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
					  </head>
					  <body>
						${mytable}
						<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
					  </body>
					</html>`
							
					aPage.length = 0 //reset array
					res.send(main) //output result
				})//endquery
				
			}//eif 
		
		})//==end db.query 
		
	}).catch((error)=>{
		res.status(500).json({error:'No Fetch Docs'})
	})		

	
})

router.get('/handshake', async(req,res) => {

	res.json({status:true})
})

	return router;
}
//module.exports = router