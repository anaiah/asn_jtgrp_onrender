const express = require('express')
const app = express()
const router = express.Router()

const fs = require('fs');

const Utils = require('./util')//== my func

const cors = require('cors')
const path = require('path')
const querystring = require("querystring")

const { connectPg, closePg, closeDb, connectDb}  = require('../db')


const cookieParser = require('cookie-parser')
app.use( cookieParser() )

connectPg() 
.then((pg)=>{
    console.log("====coor.js ASIANOW  J&T GROUP POSTGRESQL CONNECTION SUCCESS!====")
    closePg(pg);
})                        
.catch((error)=>{
    console.log("*** coor.js J&T GROUP ERROR, API.JS CAN'T CONNECT TO POSTGRESQL DB!****",error.code)
}); 

connectDb()
.then((db)=>{
    console.log("====coor.js API.JS ASIANOW  J&T GROUP MYSQL SUCCESS!====")
    closeDb(db);
})                        
.catch((error)=>{
    console.log("*** coor.js J&T GROUP ERROR, CAN'T CONNECT TO MYSQL DB!****",error.code)
});  
//=================================START HERE ============================

const getmos = () => {
    var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	series = yyyy+'-'+mm 

    return series
}


//==========SUMMARY OF COORDS
router.get('/summary/:email', async(req,res)=>{
    connectDb()
    .then((db)=>{ 

        const xmos = getmos()
        console.log('firing summary()====')
                sql2 =`SELECT 
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
                and b.created_at like '${xmos}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.area, a.location
                ORDER by a.location, 
                parcel_delivered DESC;`
    
        //console.log(sql)
        //console.log(sql2,)

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 
})


//===============syummary riders
router.get('/ridersummary/:hub', async(req,res)=>{
    connectDb()
    .then((db)=>{ 
        console.log('firing rider-summary()====')
        
        const xmos = getmos()

        sql2 =`select b.id,a.full_name, 
            count(emp_id) as transactions,
            b.emp_id, a.hub,
            sum(b.parcel) as qty,
            sum(b.actual_parcel) as actual_qty,
            round(sum(b.amount),2) as amt,
            round(sum(b.actual_amount),2) as actual_amt,
            round((sum(b.actual_parcel)/sum(b.parcel))*100) as delivered_pct,
            round(100-(sum(b.actual_parcel)/sum(b.parcel))*100) as undelivered_pct
            from asn_users a 
            left join asn_transaction b
            on  a.id = b.emp_id
            where b.created_at like '${xmos}%' and a.grp_id =1 and upper(a.hub) = '${req.params.hub}'
            group by b.emp_id 
            order by (sum(b.actual_parcel)/sum(b.parcel))*100 desc;
`
            
        //console.log(sql)
        //console.log(sql2,)

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 
})

router.get('/mtdlocation/:email', async( req, res) =>{
     connectDb()
    .then((db)=>{ 

        const xmos = getmos()

        console.log('mtd location()====')

        sql2 =`SELECT 
                a.location
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.location
                ORDER by a.location, 
                parcel_delivered DESC;`

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            //console.log(results)
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 

})

router.get('/topfivehub/:email/:trans', async(req,res)=>{
    connectDb()
    .then((db)=>{ 

        const xmos = getmos()

        if(req.params.trans=="hub"){
            console.log('top 5 hub()====')
            sql2 =`SELECT 
                a.hub AS hub,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.hub
                ORDER by parcel_delivered DESC, a.hub
                LIMIT 5;`
        }else{
            console.log('top 5 riderschart()====')
            sql2 =`SELECT 
                c.xname AS xname,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.head_email = '${req.params.email}'
                AND c.xname IS NOT NULL 
                GROUP BY c.xname
                ORDER by parcel_delivered DESC
                LIMIT 5;`
            
            
        }//eif
            
        //console.log(sql)
        //console.log(sql2,)

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            //console.log(results)
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 
})

module.exports = router;
