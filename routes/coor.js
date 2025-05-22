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
                ) as amount_remitted,

                
                (
                    round(concat(
                    ( select  sum(x.actual_parcel) 
                    from asn_transaction x 
                        join asn_users y 
                        on x.emp_id = y.id 
                        where  y.hub = c.hub and x.created_at like '2025-05%' group by y.hub
                    ) /
                    ( select  sum(x.parcel) 
                    from asn_transaction x 
                    join asn_users y 
                    on x.emp_id = y.id 
                    where  y.hub = c.hub and x.created_at like '${xmos}%' group by y.hub
                    ) * 100
                    ,'%'),0)
                ) as qty_pct

                from asn_hub  c 
                left join 
                asn_users b ON
                c.hub = b.hub
                where c.coordinator_email = '${req.params.email}'
                group by c.hub
                order by 
                c.location,
                (
                    round(
                    ( select  sum(x.actual_parcel) 
                    from asn_transaction x 
                        join asn_users y 
                        on x.emp_id = y.id 
                        where  y.hub = c.hub and x.created_at like '2025-05%' group by y.hub
                    ) /
                    ( select  sum(x.parcel) 
                    from asn_transaction x 
                    join asn_users y 
                    on x.emp_id = y.id 
                    where  y.hub = c.hub and x.created_at like '${xmos}%' group by y.hub
                    ) * 100,0)
                ) DESC ,
                 c.hub;`
            
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
            b.location,
            ( 
                select sum(x.parcel) from asn_transaction x
                join asn_users y on x.emp_id = y.id
                join asn_hub z on y.hub = z.hub 
                and z.location = b.location
            ) as parcel,
            ( 
                select sum(x.actual_parcel) from asn_transaction x
                join asn_users y on x.emp_id = y.id
                join asn_hub z on y.hub = z.hub 
                and z.location = b.location
            ) as parcel_delivered,
            ( 
                select sum(x.amount) from asn_transaction x
                join asn_users y on x.emp_id = y.id
                join asn_hub z on y.hub = z.hub 
                and z.location = b.location
            ) as amount,
            ( 
                select sum(x.actual_amount) from asn_transaction x
                join asn_users y on x.emp_id = y.id
                join asn_hub z on y.hub = z.hub 
                and z.location = b.location
            ) as amount_remitted
            from asn_hub b 
            where  b.coordinator_email = '${req.params.email}'
            group by b.location
            order by ( 
                select sum(x.actual_parcel) from asn_transaction x
                join asn_users y on x.emp_id = y.id
                join asn_hub z on y.hub = z.hub 
                and z.location = b.location
            ) DESC;
            `
        
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
            sql2 =`select 
            a.hub,
            a.location,
            sum(b.parcel) as parcel,
            sum(b.actual_parcel) as parcel_delivered,
            round(sum(b.amount),2) as amount,
            round(sum(b.actual_amount),2) as amount_remitted,
            concat(round((sum(b.actual_parcel)/sum(b.parcel))*100),'%') as qty_pct
            from asn_transaction b 
            left join asn_users c
            on  b.id = c.id
            left join asn_hub a
            on c.hub = a.hub
            where a.coordinator_email = '${req.params.email}' 
            and b.created_at like '${xmos}%' 
            group by a.hub
            order by (sum(b.actual_parcel)) DESC 
            LIMIT 5`
        }else{
            console.log('top 5 riderschart()====')
            sql2 =`select 
            c.xname,
            a.location,
            sum(b.parcel) as parcel,
            sum(b.actual_parcel) as parcel_delivered,
            round(sum(b.amount),2) as amount,
            round(sum(b.actual_amount),2) as amount_remitted,
            concat(round((sum(b.actual_parcel)/sum(b.parcel))*100),'%') as qty_pct
            from asn_transaction b 
            left join asn_users c
            on  b.id = c.id
            left join asn_hub a
            on c.hub = a.hub
            where a.coordinator_email = '${req.params.email}' 
            and b.created_at like '${xmos}%' 
            group by c.xname
            order by (sum(b.actual_parcel)) DESC 
            LIMIT 5`
            
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
