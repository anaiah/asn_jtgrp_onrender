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

//==========SUMMARY OF COORDS
router.get('/summary', async(req,res)=>{
    connectDb()
    .then((db)=>{ 

        sql2 =`select 
                c.coordinator,
                c.location,
                c.hub,
                ( select  sum(x.parcel) 
                from asn_transaction x 
                    join asn_users y 
                    on x.emp_id = y.id 
                    where  y.hub = c.hub and x.created_at like '2025-05%' group by y.hub
                ) as parcel,
                ( select  sum(x.actual_parcel) 
                from asn_transaction x 
                    join asn_users y 
                    on x.emp_id = y.id 
                    where  y.hub = c.hub and x.created_at like '2025-05%' group by y.hub
                ) as parcel_delivered,
                ( select  round(sum(x.actual_amount),2) 
                from asn_transaction x 
                    join asn_users y 
                    on x.emp_id = y.id 
                    where  y.hub = c.hub and x.created_at like '2025-05%' group by y.hub
                ) as amount,
                ( select  round(sum(x.amount),2) 
                from asn_transaction x 
                    join asn_users y 
                    on x.emp_id = y.id 
                    where  y.hub = c.hub and x.created_at like '2025-05%' group by y.hub
                ) as amount_remitted
                from asn_hub  c 
                left join 
                asn_users b ON
                c.hub = b.hub
                where c.coordinator  like '%salimbag%'
                group by c.hub
                order by c.location;`
            
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

module.exports = router;
