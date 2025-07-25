const express = require('express')
const app = express()
const router = express.Router()

const fs = require('fs');

const Utils = require('./util')//== my func

const cors = require('cors')
const path = require('path')
const querystring = require("querystring")

const { closeDb, connectDb}  = require('../db')
const db = require('../db')


const cookieParser = require('cookie-parser')
app.use( cookieParser() )

//=================================START HERE ============================

const getmos = () => {
    var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	series = yyyy+'-'+mm 

    return series
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
	
    //monthly
    var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	series = yyyy+'-'+mm 

	//const datetimestr = nuDateMysql(tamadate)

	return [nuDate, series]
	
}

const [daily, monthly] = nuDate()


//==========SUMMARY OF COORDS
router.get('/summary/:email', async(req,res)=>{
    
    try {
        const xmos = getmos()
        console.log('firing summary()====')
                sql =`SELECT 
                a.area,
                a.location,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted,
                COALESCE(round( SUM(b.actual_parcel) / SUM(b.parcel)*100,0),0) as qty_pct
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${daily}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.area, a.location
                ORDER by parcel_delivered DESC;`

        const [rows, fields] = await db.query(sql);
        res.json(rows);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }


})

//===========give location / hub per selection
router.get('/lochub/:email/:loc', async(req,res)=>{
    
    try {

        const xmos = getmos()
        console.log('firing location/hub ()====')
        sql =`SELECT 
            a.location,
            a.hub,
            COALESCE(SUM(b.parcel), 0) AS parcel,
            COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
            COALESCE(SUM(b.amount), 0) AS amount,
            COALESCE(SUM(b.actual_amount), 0) AS amount_remitted,
            COALESCE(round( SUM(b.actual_parcel) / SUM(b.parcel)*100,0),0) as qty_pct
            FROM asn_hub a
            LEFT JOIN asn_users c ON c.hub = a.hub
            LEFT JOIN asn_transaction b ON b.emp_id = c.id
            and b.created_at like '${daily}%' 
            WHERE a.head_email = '${req.params.email}'
            and a.location='${req.params.loc}'
            
            GROUP BY a.location, a.hub
            ORDER by parcel_delivered DESC;`
            
        const [rows, fields] = await db.query(sql);
        res.json(rows);
    
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }

})



//===============syummary riders
router.get('/ridersummary/:hub', async(req,res)=>{

    try {
        console.log('firing rider-summary()====')
        
        const xmos = getmos()

        sql =`select a.xname as full_name,
                a.id as emp_id,
                a.hub,
                COALESCE(sum(b.parcel),0) as qty,
                COALESCE(sum(b.actual_parcel),0) as actual_qty,
                COALESCE(round(sum(b.amount),2),0) as amt,
                COALESCE(round(sum(b.actual_amount),2),0) as actual_amt,
                COALESCE(round((sum(b.actual_parcel)/sum(b.parcel))*100),0) as delivered_pct,
                COALESCE(round(100-(sum(b.actual_parcel)/sum(b.parcel))*100),0) as undelivered_pct
                from asn_users a
                left join asn_transaction b 
                on b.emp_id = a.id
                and b.created_at like '${daily}%' 
                where a.grp_id=1 and a.active= 1 and upper(a.hub) = '${req.params.hub}'
                group by a.id
                order by actual_qty DESC, full_name;`
        
        const [rows, fields] = await db.query(sql);
        res.json(rows);
    
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }

     
})

router.get('/mtdlocation/:email', async( req, res) =>{

    try {
        
        const xmos = getmos()

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
                and b.created_at like '${daily}%' 
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
        const xmos = getmos()

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
                and b.created_at like '${daily}%' 
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
                and b.created_at like '${daily}%' 
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

module.exports = router;
