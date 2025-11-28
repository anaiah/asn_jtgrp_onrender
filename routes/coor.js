const express = require('express')
const app = express()
const router = express.Router()

const fs = require('fs');

const Utils = require('./util')//== my func

const cors = require('cors')
const path = require('path')
const querystring = require("querystring")

const {closeDb, connectDb}  = require('../db')
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
    console.log('firing summary()====')

    try {
        const xmos = getmos()
        
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
                WHERE a.coordinator_email = '${req.params.email}'
                GROUP BY a.hub
                ORDER by a.location, 
                parcel_delivered DESC;`

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
                and b.created_at = '${daily}' 
                where a.grp_id=1 and a.active= 1 and upper(a.hub) = '${req.params.hub}'
                group by a.id
                order by actual_qty DESC, full_name;`

                console.log( `====RIDER DAILY ${daily}` )
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
        //before its monthly now daily

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
            WHERE a.coordinator_email = '${req.params.email}'
            GROUP BY a.location
            ORDER by parcel_delivered DESC`

        const [rows, fields] = await db.query(sql);
        res.json(rows);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }


  

})

router.get('/getlocation/:email',async(req, res)=>{

    try {
        const xmos = getmos()

        console.log('get all location()====')

        sql =`SELECT 
            a.id,
            a.location
            FROM asn_hub a
            LEFT JOIN asn_users c ON c.hub = a.hub
            WHERE a.coordinator_email = '${req.params.email}'
            GROUP BY a.location
            ORDER by a.location`

        const [rows, fields] = await db.query(sql);
        res.json(rows);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }
})

router.get('/gethub/:location/:email',async(req, res)=>{
    try {
        const xmos = getmos()

        console.log('get all hub()====')

        sql =`SELECT 
            a.id,
            a.hub
            FROM asn_hub a
            LEFT JOIN asn_users c ON c.hub = a.hub
            WHERE a.coordinator_email = '${req.params.email}'
            and lower(a.location) = '${req.params.location}'
            GROUP BY a.hub
            ORDER by a.hub`
        
        const [rows, fields] = await db.query(sql);
        res.json(rows);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }

   
})

//==============ADD USER =====
router.post('/adduser', async( req, res ) => {


    try {
        console.log('=========SAVING TO user ============')

	    const sql = `INSERT into asn_users (full_name,xname,grp_id,email,pwd,pic,hub,active) 
                    VALUES(?,?,?,?,?,?,?,?)`

        const [rows, fields] = await db.query(sql,[ 
					req.body.name.toUpperCase(), 
					req.body.name.toUpperCase(), 
                    1,
					req.body.email, 
					'123',
					'guestmale.jpg',
                    req.body.hub.toUpperCase(),
                    1
				],);

        return res.status(200).json({success:'ok', msg:'RECORD SUCCESSFULLY SAVED!'})

    } catch (err) {
        console.error('Error:', err);//console.error('Error Login',err)
        if(err.code === 'ER_DUP_ENTRY'){
            return res.status(400).json({success:'fail',msg:'EMAIL ALREADY EXIST!!!'})
        //return res.status(500).json({error:"error!"})
        }else{
            return res.status(400).json({success:'fail',msg:'DATABASE ERROR, PLEASE TRY AGAIN!!!'})
        }

    }
    
})

router.get('/five/:email/:trans',async(req,res)=>{

    try {
        const xmos = getmos()
        //console.log(xmos)
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
                WHERE a.coordinator_email = '${req.params.email}'
                GROUP BY a.hub
                ORDER by parcel_delivered DESC`

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
                WHERE a.coordinator_email = '${req.params.email}'
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
                WHERE a.coordinator_email = '${req.params.email}'
                AND c.xname IS NOT NULL 
                GROUP BY c.xname
                ORDER by parcel_delivered DESC
                LIMIT 5;`
            
        }//eif

        //console.log(sql)
        const [rows, fields] = await db.query(sql);
        res.json(rows);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error occurred');
    }
 
})

module.exports = router;
