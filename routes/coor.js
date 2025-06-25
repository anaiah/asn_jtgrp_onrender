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
                and b.created_at like '${xmos}%' 
                WHERE a.coordinator_email = '${req.params.email}'
                GROUP BY a.hub
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

        sql2 =`select a.xname as full_name,
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
                and b.created_at like '${xmos}%' 
                where a.grp_id=1 and a.active= 1 and upper(a.hub) = '${req.params.hub}'
                group by a.id
                order by actual_qty DESC, full_name;`
            
        //console.log(sql)
        console.log(sql2,)

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
                a.location,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.coordinator_email = '${req.params.email}'
                GROUP BY a.location
                ORDER by parcel_delivered DESC`
        
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
const mysqls = require('mysql2/promise')

router.get('/getlocation/:email',async(req, res)=>{
    connectDb()
    .then((db)=>{ 

        const xmos = getmos()

            console.log('get all location()====')

            sql2 =`SELECT 
                a.id,
                a.location
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                WHERE a.coordinator_email = '${req.params.email}'
                GROUP BY a.location
                ORDER by a.location`
        
        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    })
})

router.get('/gethub/:location/:email',async(req, res)=>{
    connectDb()
    .then((db)=>{ 

        const xmos = getmos()

            console.log('get all hub()====')

            sql2 =`SELECT 
                a.id,
                a.hub
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                WHERE a.coordinator_email = '${req.params.email}'
                and lower(a.location) = '${req.params.location}'
                GROUP BY a.hub
                ORDER by a.hub`
        
        //console.log(sql2)
        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    })
})

//==============ADD USER =====
router.post('/adduser', async( req, res ) => {
    console.log('=========SAVING TO user ============')

	const sql = `INSERT into asn_users (full_name,xname,grp_id,email,pwd,pic,hub,active) 
                    VALUES(?,?,?,?,?,?,?,?)`

    connectDb()
    .then((db)=>{

		try{

			db.query( sql ,
				[ 
					req.body.name.toUpperCase(), 
					req.body.name.toUpperCase(), 
                    1,
					req.body.email, 
					'123',
					'guestmale.jpg',
                    req.body.hub.toUpperCase(),
                    1
				],(err,result) => {
			
                    //console.log(err,result)
				if(err){
					//console.error('Error Login',err)
					if(err.code === 'ER_DUP_ENTRY'){
						return res.status(400).json({success:'fail',msg:'EMAIL ALREADY EXIST!!!'})
					//return res.status(500).json({error:"error!"})
					}else{
						return res.status(400).json({success:'fail',msg:'DATABASE ERROR, PLEASE TRY AGAIN!!!'})
					}
                }
    
                if(result){
                
                    return res.status(200).json({success:'ok', msg:'RECORD SUCCESSFULLY SAVED!'})
               
                }//eif
            	//eif
			})
			

		}catch (error){
			console.error('Error Login',err)
			res.status(500).json({error:"error!"})

		}finally{
			closeDb(db)
		
		}//end try
	
	}).catch((error)=>{
        res.status(500).json({error:'Error'})
    })

})

router.get('/five/:email/:trans',async(req,res)=>{
    try{
    console.log('five')
    const dbconfig  ={
	host: 'srv1759.hstgr.io',
	user: 'u899193124_asianowjt',
	password: 'M312c4@g125c3',
	database: 'u899193124_asianowjt'
    }

    const xmos = getmos()
    console.log(xmos)
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
                WHERE a.coordinator_email = '${req.params.email}'
                GROUP BY a.hub
                ORDER by parcel_delivered DESC`
                
    const conn = await mysqls.createConnection(dbconfig);
    
    const [results, fields] = await conn.execute( sql2 )
    
    
    console.log('tokwa',results)
    res.json( results)
    await conn.end()

    }catch (err){
        console.log(err)
        res.status(500).json({error:'serror'})
    }
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
                WHERE a.coordinator_email = '${req.params.email}'
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
                WHERE a.coordinator_email = '${req.params.email}'
                AND c.xname IS NOT NULL 
                GROUP BY c.xname
                ORDER by parcel_delivered DESC
                LIMIT 5;`
            
        }//eif
            
        //console.log(sql)
        //console.log(sql2,)

        db.query( sql2 , null , (error, results)=>{
            
            
            //console.log(results)
            
            //console.log(  results) 
            res.send(results )
            closeDb( db )
        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 
})

module.exports = router;
