const express = require('express')
const app = express()
const router = express.Router()

const fs = require('fs');

const Utils = require('./util')//== my func

const cors = require('cors')
const path = require('path')
const querystring = require("querystring")

const { connectPg, closePg, closeDb, connectDb}  = require('../db')

const db = require('../db')

const cookieParser = require('cookie-parser')
app.use( cookieParser() )

//=================================START HERE ============================

const getmos = () => {
    var series = new Date() 
    var dd = String( series.getDate()).padStart(2, '0')
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	const series1 = yyyy+'-'+mm 
    const series2 = yyyy+'-'+mm+'-'+dd

    return [series1, series2]
}


//==========SUMMARY OF COORDS
// router.get('/summary/:email', async(req,res)=>{

//     try {
//         const [ xmos, ymos ] = getmos()

//         console.log('firing summary()====')
//             //         sql =`SELECT 
//             //         a.region,
//             //         a.area,
//             //         COALESCE(round(SUM(b.parcel)), 0) AS parcel,
//             //         COALESCE(round(SUM(b.actual_parcel)), 0) AS parcel_delivered,
//             //         COALESCE(round(SUM(b.amount),2), 0) AS amount,
//             //         COALESCE(round(SUM(b.actual_amount),2), 0) AS amount_remitted,
//             //         COALESCE(round( SUM(b.actual_parcel) / SUM(b.parcel)*100,0),0) as qty_pct
//             //         FROM asn_hub a
//             //         LEFT JOIN asn_users c ON c.hub = a.hub
//             //         LEFT JOIN asn_transaction b ON b.emp_id = c.id
//             //         and b.created_at like '${ymos}%' 
//             //         GROUP BY a.region,a.area
//             //         ORDER by parcel_delivered DESC, a.region;`
        
//             // const [rows, fields] = await db.query(sql);
//             // res.json(rows);
// const datestr = ymos; // Your date string format (e.g., '2026-08%')

// // 1. Fetch your active master regions list
// const [regionsList] = await db.query("SELECT region_name FROM besi_region ORDER BY region_name ASC");

// const result = [];

// // 2. Loop through each region
// for (const row of regionsList) {
//     const regionName = row.region_name;
//     const regionTableCode = regionName.toLowerCase();
    
//     const hubTable = `besi_${regionTableCode}_hub`;
//     const employeeTable = `besi_employees_${regionTableCode}`;

//     // --- STEP A: Fetch clean, unique reference areas from your hub table ---
//     const [hubMapping] = await db.query(`
//         SELECT UPPER(TRIM(location)) as loc, UPPER(TRIM(area)) as area_name 
//         FROM ${hubTable}
//         GROUP BY UPPER(TRIM(location)), UPPER(TRIM(area))
//     `);

//     // Create a quick lookup map for your locations to areas
//     const locationToArea = {};
//     hubMapping.forEach(h => {
//         locationToArea[h.loc] = h.area_name;
//     });

//     // --- STEP B: Run your EXACT FIRST QUERY, but group by raw location string ---
//     // This query is guaranteed to have the correct 179 totals because it doesn't inflate!
//     const cleanSql = `
//         SELECT 
//             UPPER(TRIM(emp.location)) AS raw_location,
//             COUNT(DISTINCT emp.emp_id) AS reg,
//             COUNT(DISTINCT tx.emp_id) AS logged,
//             COALESCE(CAST(ROUND(SUM(tx.parcel), 0) AS SIGNED), 0) AS parcel,
//             COALESCE(CAST(ROUND(SUM(tx.actual_parcel), 0) AS SIGNED), 0) AS parcel_delivered,
//             COALESCE(ROUND(SUM(tx.amount), 2), 0) AS amount,
//             COALESCE(ROUND(SUM(tx.actual_amount), 2), 0) AS amount_remitted
//         FROM ${employeeTable} emp
//         LEFT JOIN besi_transaction tx 
//             ON tx.emp_id = emp.emp_id
//             AND upper(tx.region) = ?
//             AND tx.created_at LIKE ?
//         WHERE emp.position = '01' 
//           AND emp.active = 1
//         GROUP BY UPPER(TRIM(emp.location))
//     `;

//     const [rawRiderRows] = await db.query(cleanSql, [regionName.toUpperCase(), '2026-08-17']); //// thsis orig `${datestr}%`

//     // --- STEP C: Use JavaScript memory to bundle locations into Areas cleanly ---
//     const areaMap = {};

//     rawRiderRows.forEach(item => {
//         // Find which Area this location belongs to from your reference map
//         // If it's a blank or missing reference location, default it to 'UNASSIGNED'
//         const matchedArea = locationToArea[item.raw_location] || 'UNASSIGNED AREA';
//         const key = `${regionName}_${matchedArea}`;

//         if (!areaMap[key]) {
//             areaMap[key] = {
//                 region: regionName.toUpperCase(),
//                 area: matchedArea,
//                 reg: item.reg,
//                 logged: item.logged,
//                 parcel: item.parcel,
//                 parcel_delivered: item.parcel_delivered,
//                 amount: item.amount,
//                 amount_remitted: item.amount_remitted
//             };
//         } else {
//             // Add the unmultiplied numbers together into the final area bucket
//             areaMap[key].reg += item.reg;
//             areaMap[key].logged += item.logged;
//             areaMap[key].parcel += item.parcel;
//             areaMap[key].parcel_delivered += item.parcel_delivered;
//             areaMap[key].amount += item.amount;
//             areaMap[key].amount_remitted += item.amount_remitted;
//         }
//     });

//     // Push the clean region group records into our master list
//     Object.values(areaMap).forEach(areaItem => {
//         // Calculate percentages safely now that the values are unified
//         areaItem.attendance_pct = areaItem.reg > 0 ? Math.round((areaItem.logged / areaItem.reg) * 100) : 0;
//         areaItem.qty_pct = areaItem.parcel > 0 ? Math.round((areaItem.parcel_delivered / areaItem.parcel) * 100) : 0;
        
//         result.push(areaItem);
//     });
// }

// // 3. Sort final array: Highest delivery counts first
// result.sort((x, y) => {
//     if (y.parcel_delivered !== x.parcel_delivered) {
//         return y.parcel_delivered - x.parcel_delivered;
//     }
//     return x.region.localeCompare(y.region);
// });

// // ---- [ RETURN 100% CORRECT DATA PLAYLOAD ] ----
// res.status(200).json({ success: 'ok', data: result });


//     } catch (err) {
//         console.error('Error:', err);
//         res.status(500).send('Error occurred');
//     }
     
// })

router.get('/summary/:email', async(req,res)=>{
    try {

        const [ xmos, ymos ] = getmos()
        const datestr = ymos; // Your date string format (e.g., '2026-08%')

        // Step 1: Start directly with the array of all regions from your master table
        const [regions] = await db.query('SELECT region_name FROM besi_region');
        
        // This object will accumulate our final totals grouped by "Region + Area"
        const gridDataMap = {};

        // Step 2: Loop through each region in the array one by one
        for (const r of regions) {
            const regionName = r.region_name;

            try {
                // Fetch the hub-to-area mapping for this specific region's table
                const [hubAreaMappings] = await db.query(`SELECT hub, area FROM besi_${regionName}_hub`);
                
                // Fetch the employee-to-hub mapping for this specific region's table
                const [employeeHubMappings] = await db.query(`SELECT emp_id, hub FROM besi_employees_${regionName} 
                    where (position = '01' or position = '17') and active = 1`);

                // Fetch and sum up the transactions belonging strictly to this region
                const [transactions] = await db.query(`
                    SELECT emp_id, 
                    COALESCE(CAST(ROUND(SUM(parcel), 0) AS SIGNED), 0) AS parcel,
                    COALESCE(CAST(ROUND(SUM(actual_parcel), 0) AS SIGNED), 0) AS parcel_delivered,
                    COALESCE(round(SUM(amount),2), 0) AS amount,
                    COALESCE(round(SUM(actual_amount),2), 0) AS amount_remitted
                    FROM besi_transaction
                    WHERE region = ? and created_at LIKE '${datestr}%'  -- Replace with your dynamic date string
                    GROUP BY emp_id
                `, [regionName.toLowerCase()]);

                console.log(`Region: ${regionName} | Transactions fetched: ${transactions.length}`);

                // Step 3: Match them up easily inside Node.js memory
                transactions.forEach(tx => {
                    // Find which hub this employee belongs to
                    const empMapping = employeeHubMappings.find(e => e.emp_id === tx.emp_id);
                    const hubName = empMapping ? empMapping.hub : null;

                    // --- DEBUG LOG 1: Rider not found in Employee Table ---
                    if (!empMapping) {
                        console.warn(`⚠️ [DATA ERROR] Rider emp_id '${tx.emp_id}' from transactions was NOT found in table: besi_employees_${regionName.toLowerCase()}`);
                    }

                    // Find which area that hub belongs to
                    const areaMapping = hubAreaMappings.find(h => h.hub === hubName);
                    let areaName = '** UNKNOWN';

                    if (areaMapping) {
                        areaName = areaMapping.area;
                    } else {
                        // --- DEBUG LOG 2: Hub name not found in Hub Table ---
                        const searchTarget = hubName ? `'${hubName}'` : 'NULL/MISSING';
                        console.warn(`🔍 [UNKNOWN AREA] Could not find Hub ${searchTarget} for Rider '${tx.emp_id}' inside table: besi_${regionName.toLowerCase()}_hub`);
                    }

                    // Create a unique key for grouping (e.g., "North_Manila")
                    const uniqueGroupKey = `${regionName}_${areaName}`;

                    // If we haven't seen this region + area combo yet, initialize it
                    if (!gridDataMap[uniqueGroupKey]) {
                        gridDataMap[uniqueGroupKey] = {
                            region: regionName.toUpperCase(),
                            area: areaName,
                            parcel: 0,
                            parcel_delivered: 0,
                            amount: 0,
                            amount_remitted: 0
                        };
                    }

                    // Add the transaction sums to this specific Region and Area combo
                    gridDataMap[uniqueGroupKey].parcel += parseInt(tx.parcel) || 0;
                    gridDataMap[uniqueGroupKey].parcel_delivered += parseInt(tx.parcel_delivered) || 0;
                    gridDataMap[uniqueGroupKey].amount += parseFloat(tx.amount) || 0;
                    gridDataMap[uniqueGroupKey].amount_remitted += parseFloat(tx.amount_remitted) || 0;
                });


            } catch (regionError) {
                // If one region's dynamic tables don't exist yet, log it and move to the next region safely
                console.error(`Skipping region ${regionName} due to missing or empty tables:`, regionError.message);
            }
        }

        // Step 4: Convert our grouped object back into a clean array for Grid.js
        const finalGridArray = Object.values(gridDataMap);
        res.json(finalGridArray);

    } catch (error) {
        console.error("Critical database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }


});


//===============syummary riders
router.get('/ridersummary/:hub/:region', async(req,res)=>{

    try {
        console.log('firing rider-summary()====')
        
        const [xmos,ymos] = getmos()
        const regionTable = `besi_employees_${req.params.region.toLowerCase()}` 

        sql = `SELECT 
            a.full_name,
            a.emp_id, 
            a.hub,
            COALESCE(SUM(b.parcel), 0) AS qty,
            COALESCE(SUM(b.actual_parcel), 0) AS actual_qty,
            COALESCE(ROUND(SUM(b.amount), 2), 0) AS amt,
            COALESCE(ROUND(SUM(b.actual_amount), 2), 0) AS actual_amt,
            COALESCE(ROUND((SUM(b.actual_parcel) / NULLIF(SUM(b.parcel), 0)) * 100), 0) AS delivered_pct,
            COALESCE(ROUND(100 - (SUM(b.actual_parcel) / NULLIF(SUM(b.parcel), 0)) * 100), 0) AS undelivered_pct
        FROM ${regionTable} a
        LEFT JOIN besi_transaction b 
            ON b.emp_id = a.emp_id
            AND b.region = '${req.params.region}'
            AND b.created_at LIKE '${ymos}%'
        WHERE ( a.position = '01' OR a.position = '17' )
        AND a.active = 1 
        AND UPPER(a.hub) = '${req.params.hub.toUpperCase()}'
        GROUP BY a.emp_id, a.full_name, a.hub
        ORDER BY actual_qty DESC, a.full_name;`;
        
        const [rows, fields] = await db.query(sql);
        res.json(rows);



    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }


})

// router.get('/opmgrlocation/:area', async( req, res) =>{

//     try {
//         const [xmos,ymos] = getmos()

//         console.log('mtd location()====')

//         sql =`SELECT 
//                 a.location,
//                 a.hub,
//                 COALESCE(round(SUM(b.parcel)), 0) AS parcel,
//                 COALESCE(round(SUM(b.actual_parcel)), 0) AS parcel_delivered,
//                 COALESCE(round(SUM(b.amount),2), 0) AS amount,
//                 COALESCE(round(SUM(b.actual_amount),2), 0) AS amount_remitted
//                 FROM asn_hub a
//                 LEFT JOIN asn_users c ON c.hub = a.hub
//                 LEFT JOIN asn_transaction b ON b.emp_id = c.id
//                 and b.created_at like '${ymos}%' 
//                 WHERE a.area = '${req.params.area}'
//                 GROUP BY a.location,a.hub
//                 ORDER by a.location,parcel_delivered DESC;`

//         const [rows, fields] = await db.query(sql);
//         res.json(rows);

//     } catch (err) {
//         console.error('Error:', err);
//         res.status(500).send('Error occurred');
//     }

// })

router.get('/opmgrlocation/:area', async (req, res) => {
    try {
        const [xmos, ymos] = getmos(); // Your monthly date string format (e.g., '2026-08')
        const targetArea = req.params.area.trim().toUpperCase();

        // 1. Fetch your active master regions list to look through the table sets
        const [regionsList] = await db.query("SELECT region_name FROM besi_region ORDER BY region_name ASC");

        const locationMap = {};

        // 2. Loop through regions to find matching Hub/Area records
        for (const row of regionsList) {
            const regionName = row.region_name;
            const regionCode = regionName.toLowerCase();
            
            const hubTable = `besi_${regionCode}_hub`;
            const employeeTable = `besi_employees_${ regionCode}`;

            // --- STEP A: Fetch unique Hubs/Locations assigned to this specific Area ---
            const hubSql = `
                SELECT UPPER(TRIM(hub)) as clean_hub, UPPER(TRIM(location)) as clean_loc 
                FROM ${hubTable}
                WHERE UPPER(TRIM(area)) = ?
                GROUP BY UPPER(TRIM(hub)), UPPER(TRIM(location))
            `;
            const [matchedHubs] = await db.query(hubSql, [targetArea]);

            // If this region doesn't contain the requested Area, skip to the next region instantly
            if (matchedHubs.length === 0) continue;

            // --- STEP B: Run the isolated, non-inflating query for this region ---
            const cleanSql = `
                SELECT 
                    UPPER(TRIM(emp.hub)) AS raw_hub,
                    UPPER(TRIM(emp.location)) AS raw_location,
                    COALESCE(CAST(ROUND(SUM(tx.parcel), 0) AS SIGNED), 0) AS parcel,
                    COALESCE(CAST(ROUND(SUM(tx.actual_parcel), 0) AS SIGNED), 0) AS parcel_delivered,
                    COALESCE(ROUND(SUM(tx.amount), 2), 0) AS amount,
                    COALESCE(ROUND(SUM(tx.actual_amount), 2), 0) AS amount_remitted
                FROM ${employeeTable} emp
                LEFT JOIN besi_transaction tx 
                    ON tx.emp_id = emp.emp_id
                    AND tx.region = ?
                    AND tx.created_at LIKE ?
                WHERE emp.position = '01' 
                  AND emp.active = 1
                GROUP BY UPPER(TRIM(emp.hub)), UPPER(TRIM(emp.location))
            `;
            const [rawRiderRows] = await db.query(cleanSql, [regionName.toLowerCase(), `${ymos}%` ]);  ///orig is `${ymos}%`

            // Create a quick set of valid hubs for this area to verify against
            const validHubsForArea = new Set(matchedHubs.map(h => h.clean_hub));

            // --- STEP C: Process and filter the numbers using JavaScript memory ---
            rawRiderRows.forEach(item => {
                // Only count riders whose hubs belong to this specific requested Area!
                if (validHubsForArea.has(item.raw_hub)) {
                    // Create a unique key per Hub + Location combo inside this Area
                    const key = `${item.raw_location}_${item.raw_hub}`;

                    if (!locationMap[key]) {
                        locationMap[key] = {
                            location: item.raw_location,
                            hub: item.raw_hub,
                            parcel: item.parcel,
                            parcel_delivered: item.parcel_delivered,
                            amount: item.amount,
                            amount_remitted: item.amount_remitted
                        };
                    } else {
                        // Safe fallback accumulator merge rule
                        locationMap[key].parcel += item.parcel;
                        locationMap[key].parcel_delivered += item.parcel_delivered;
                        locationMap[key].amount += item.amount;
                        locationMap[key].amount_remitted += item.amount_remitted;
                    }
                }
            });
        }

        // 3. Convert map back to an array
        const finalRows = Object.values(locationMap);

        // 4. Sort results exactly like your original request: by Location name, then by highest deliveries
        finalRows.sort((x, y) => {
            if (x.location !== y.location) {
                return x.location.localeCompare(y.location); // Alphabetical by Location
            }
            return y.parcel_delivered - x.parcel_delivered; // Highest parcel count first
        });

        // Send clean, unmultiplied response back to your data grid
        res.json(finalRows);

    } catch (err) {
        console.error('Drill-down Area Location Error:', err);
        res.status(500).send('Error occurred while fetching location breakdown');
    }
});


router.get('/mtdlocation/:email', async( req, res) =>{
    try {
        const [xmos,ymos] = getmos()

        console.log('mtd location()====')

        sql =`SELECT 
                a.location,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${ymos}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.location
                ORDER by parcel_delivered DESC;`

        const [rows, fields] = await db.query(sql);
        res.json(rows);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }

   
})

router.get('/topfivehub/:email/:trans', async(req,res)=>{

    try {

        const [xmos,ymos] = getmos()

        if(req.params.trans=="hub"){
            console.log('top 5 hub()====')
            sql =`SELECT 
                a.hub AS hub,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${ymos}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.hub
                ORDER by parcel_delivered DESC, a.hub
                LIMIT 5;`
        }else{
            console.log('top 5 riderschart()====')
            sql =`SELECT 
                c.xname AS xname,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${ymos}%' 
                WHERE a.head_email = '${req.params.email}'
                AND c.xname IS NOT NULL 
                GROUP BY c.xname
                ORDER by parcel_delivered DESC
                LIMIT 5;`
        }//eif

        const [rows, fields] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }
 
})

router.get('/getperhour', async(req,res)=>{

    try {
        console.log('firing getperhour()==')
       
        const [xmos,ymos] = getmos()

        sql = `SELECT 
            DATE_FORMAT(login_time,'%H:00 %p') as hr_start,
            (SUM(sum(parcel)) OVER (ORDER BY HOUR(login_time))) AS parcel_taken,
            round(SUM(sum(actual_parcel)) OVER (ORDER BY HOUR(login_time)),0) AS hourly_delivered,
            round(SUM(sum(actual_amount)) OVER (ORDER BY HOUR(login_time)),2) AS hourly_remit
            FROM asn_transaction
            WHERE created_at='${ymos}'
            GROUP BY HOUR(login_time);`

        const [rows, fields] = await db.query(sql);
        res.json(rows);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }

})


module.exports = router;
