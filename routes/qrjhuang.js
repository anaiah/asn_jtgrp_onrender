
//express first
const express = require('express');

const querystring = require("querystring")

const cookieParser = require('cookie-parser')

const cors = require('cors')

const path = require('path')

const router = express.Router()

const fs = require('fs');

const app = express()
app.use( cookieParser() )

const db  = require('../db')// your pool module
const { connectDb, closeDb } = require('../db')

//=====CLAIMS UPLOAD
const QRCode = require('qrcode')  // qrcode maker
const multer = require('multer') // for file manipulate
const sharp = require('sharp')   // for image manipulate

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

//emailer
const nodemailer = require("nodemailer")

//excel
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

const mysqls = require('mysql2/promise')
const { emitWarning } = require('process')

const dbconfig  ={
        host: '153.92.15.50',
        user: 'u899193124_asianowjt',
        password: 'G125c3@M312c4',
        database: 'u899193124_asianowjt',
};

router.get('/testmail', async(req,res)=>	{
     res.json({
        message: "UPDATED Successfully!",
        voice:"Equipment Updated Successfully!"
    })
})

// Helper function to create a 1-second delay between emails
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


//GET COUNTRIES
// server.js (or wherever your other routes live)
router.get('/countries', async (req, res) => {
    try {
        const response = await fetch('https://api.restcountries.com/countries/v5?region=Asia&limit=100', {
            headers: { 'Authorization': `Bearer rc_live_1521daf9c1304a99bc8cdca90b5d3b52` }
        });
        const data = await response.json();
        const countryNames = data.data.objects.map(c => c.names.common);
        res.json(countryNames);
    } catch (error) {
        console.error('Failed to fetch countries:', error);
        res.status(500).json({ error: 'Failed to fetch country list' });
    }
});

//======= late registrants ==================//

router.post('/savereg', async (req, res) => {
    const {
        firstName, lastName, email,
        phone, company, eventName, country,
        jobFunction, industry
    } = req.body;

    // Basic required-field validation
    if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: 'First name, last name, and email are required.' });
    }
    
    let conn
    try {

         conn = await mysqls.createConnection(dbconfig);
   
        
        // 🔧 Adjust table/column names to match your actual schema
        const [result] = await conn.execute(
            `INSERT INTO qr_jhuang
                ( first_name, last_name, email, business_phone, company, event, country, job_function, industry, date_added)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [ firstName, lastName, email, phone, company, eventName, country, jobFunction, industry]
        );

        res.status(201).json({
            message: 'Registration saved successfully.',
            insertId: result.insertId
        });

    } catch (error) {
        console.error('Database error saving registration:', error);
        res.status(500).json({ message: 'Failed to save registration.' });
    } finally {
        await conn.end(); // Ensure the connection is closed after the operation
    }
});

//====================UPLOAD EXCEL AND SEND EMAIL WITH QR CODE========================
router.post('/qrxls' , upload.single('hris_upload_file'), async (req, res) => {

  console.log('==FIRING qrxls() ==');

  try {
   
    const xtable = `qr_jhuang`;
    
    const conn = await mysqls.createConnection(dbconfig);
   
    // Read Excel
    const workbook = xlsx.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

      // Array to collect valid employee info for the email blast
    const emailsToBlast = [];

    for (const record of data) {
        if (!record || Object.values(record).every(val => val === null || val === '')) {
            continue; // skip empty
        }

        // Destructure fields
        const {
            first_name,
            last_name,
            email,
            company,
            event,
            country,
            business_phone,
            job_function,
            industry
        } = record;

        /*
        or u can do this if the actual headers in excel have spaces or two words
        // Destructure fields with spaces and map them to standard variables
        it will First Name header in excel will be saved in first_name var 
        
            const {
                "First Name": first_name,
                "Last Name": last_name,
                "Email": email
            } = record;
        */

        //for email lowercase
        const emailLower = (email ?? '').toLowerCase();
        
        // ================ Insert user
        const query = `INSERT INTO ${xtable} (first_name, last_name, email, company, event, country, business_phone, job_function, industry) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        // Replace undefined with null
        const params = [
            first_name ?? null,
            last_name ?? null,
            emailLower,
            company ?? null,
            event ?? null,
            country ?? null,
            business_phone ?? null,
            job_function ?? null,
            industry ?? null
        ];

        await conn.execute(query, params);

         // Collect data for the blast only if a valid email exists
        if (emailLower && emailLower.includes('@')) {
            emailsToBlast.push({
                fullName: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
                email: emailLower,
                company: company ?? '',
                event: event ?? '',
                country: country ?? '',
                business_phone: business_phone ?? '',
                job_function: job_function ?? '',
                industry: industry ?? ''
            });
        }
    }

    // Now update the series table with latest number
   
    await conn.end();

    console.log('SUCCESS: Excel uploaded and data inserted. Series updated.');
    
    // 2. Configure Nodemailer Transporter
    // let transporter = nodemailer.createTransport({
    //     service: 'gmail',
    //     auth: {
    //         //user : 'ulianluis.macarandan@vertivco.com'
    //        user: 'adminbesi@gmail.com',
    //        pass: 'eumgsmqfjrebyxvn'
    //     },
    //     tls:{
    //         rejectUnauthorized:false
    //     }
    // });

     const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        auth: {
        user: 'admin@vertiv-asia.com',
        pass: 'mQ6YkMi2/',
        },
    });

    // let transporter = nodemailer.createTransport({
    // host: '://office365.com',
    // port: 587,
    // secure: false, // Must be false for 587; it upgrades to TLS automatically via STARTTLS
    
    // auth: {
    //     user: 'julianluis.macarandan@vertivco.com', // Your client's full company email
    //     pass: 'softBrownies21'        // Their 16-character Microsoft App Password
    // },

    // tls: {
    //     ciphers: 'SSLv3', // Helps compatibility with Microsoft servers
    //     rejectUnauthorized: false
    // }
    // });

    // Track mailing operations
    const emailSummary = { totalSent: 0, failures: [] };
    let url;

    // 3. Trigger Email Blast Loop using the collected spreadsheet data
    for (const recipient of emailsToBlast) {
        try {

              // 2. Generate the QR code as a Base64 Image Buffer string
            // You can encode any text here, like their email, employee ID, or a profile link
            url = `${recipient.fullName}/${recipient.email}/${recipient.company}/${recipient.event}`;

            const qrBuffer = await QRCode.toBuffer( url, {
                type: 'png',
                width: 250,
                margin: 2
            });

            await transporter.sendMail({
                from: '"VERTIV" <admin@vertiv-asia.com>',
                to: recipient.email,
                bcc: 'anaiahdaniel@gmail.com',
                subject: 'VERTIV Event Registration QR Code',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2>Hello ${recipient.fullName || 'Employee'},</h2>
                        <p>Your details have been successfully REGISTERED! Below is your unique personal QR Code:</p>
                        
                        <div style="text-align: center; margin: 25px 0;">
                            <img src="cid:uniqueQRCodeImage" alt="HR QR Code" style="border: 2px solid #333; padding: 5px;" />
                        </div>  <br>

                        <p style="color: #666; font-size: 12px;">Please present upon arrival and claim your event badge.<br><br>
                        Do not share this code with anyone else.</p><br>

                        <p>Best regards,<br>Vertiv Team</p><br><br>

                        <font color=red>PLS. DO NOT REPLY, THIS IS A SYSTEM GENERATED EMAIL.</font><br><br>
                        <img src='https://www.vertiv.com/Content/images/phase3/about/timeline/Vertiv-Logo.svg' height='50'>
                    </div>
                `,
                  // 4. Attach the raw image buffer to the email message under the matching content ID (cid)
                attachments: [{
                    filename: 'qrcode.png',
                    content: qrBuffer,
                    cid: 'uniqueQRCodeImage' // This must match the img src "cid:uniqueQRCodeImage" exactly
                }]
            });
            emailSummary.totalSent++;
            await sleep(1000); // 1-second break to satisfy Gmail's rate protection
            
        } catch (mailError) {
            console.error(`Failed to send email to ${recipient.email}:`, mailError.message);
            emailSummary.failures.push({ email: recipient.email, error: mailError.message });
        }
    }

    // 4. Send unified response back to your client frontend
    res.status(200).json({ 
        status: true,
        message: 'Registration uploaded and email blast finished!',
        insertedCount: data.length,
        emailsSentCount: emailSummary.totalSent,
        failedEmails: emailSummary.failures 
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//====================to mark the attendance after qr scan============
router.get('/mark-attendance/:name/:email/:company/:event', async (req, res) => {
  
     const { name, email, company, event } = req.params;

    console.log( req.params.name, 'scanned!')  

    try {
        const updateSql = `
                UPDATE qr_jhuang SET 
                arrived = ?, date_added = NOW()
                WHERE email = ? 
            `;
        console.log(updateSql)
        await db.query(updateSql, [ 1, email ]);

        res.status(200).json({ 
            status: true,
            message: 'Registration Success!',
            xname: name.toUpperCase(),
            xemail: email,
            xcompany: company,
            xevent: event,
            displayname: name.split(' ')[0]
            //insertedCount: data.length,
            //emailsSentCount: emailSummary.totalSent,
            //failedEmails: emailSummary.failures 
        });
    }catch (err){
         console.error(err);
        return res.status(500).json({ ok: false, error: err.message });

    }

   

    // return res.send(renderAttendanceStatus({
    //     title: "Attendance Logged!",
    //     message: `Welcome, ${name}. Your check-in has been successfully recorded for today.`,
    //     isSuccess: true,
    //     redirectUrl: "https://anaiah.github.io/qr-joyhuang"
    // }));

});

//=====================to mark the attendance after re printing of badge label============
router.get('/remark-attendance/:email', async (req, res) => {
  
     const { email } = req.params;

    console.log( req.params.email, 'reprinted!')
    try {
        const updateSql = `
                UPDATE qr_jhuang SET 
                arrived = ?, date_added = NOW()
                WHERE email = ? 
            `;
        console.log(updateSql)
        await db.query(updateSql, [ 1, email ]);

        res.status(200).json({ 
            status: true,
            xstatus: 'Arrived',
            xemail : email
        });
    }catch (err){
         console.error(err);
        return res.status(500).json({ ok: false, error: err.message });

    }
});


//===== format the output of mark attendnace
function renderAttendanceStatus({ title, message, isSuccess, redirectUrl }) {
    const themeColor = isSuccess ? "#198754" : "#dc3545"; 
    
    // Pure inline SVG Icons to guarantee immediate rendering
    const icon = isSuccess 
        ? `<svg width="64" height="64" fill="${themeColor}" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>`
        : `<svg width="64" height="64" fill="${themeColor}" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>`;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            /* Reset & Baseline styles */
            * { box-sizing: border-box; }
            body { 
                background-color: #121212; 
                color: #e0e0e0; 
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 15px;
            }
            /* Clean Dark-Theme UI Card */
            .status-card {
                background-color: #1e1e1e;
                border: 1px solid #2d2d2d;
                border-top: 5px solid ${themeColor};
                border-radius: 16px;
                padding: 30px 24px;
                text-align: center;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            .title {
                color: #ffffff;
                font-size: 22px;
                font-weight: 700;
                margin: 15px 0 10px 0;
            }
            .message {
                color: #aaaaaa;
                font-size: 14px;
                line-height: 1.5;
                margin: 0 0 24px 0;
            }
            .footer-divider {
                border-top: 1px solid #2d2d2d;
                padding-top: 15px;
                margin-top: 5px;
            }
            .countdown-text {
                font-size: 13px;
                color: #777777;
                margin: 0;
            }
            #countdown {
                font-weight: 700;
                color: #ffffff;
            }
        </style>
        <!-- Security redirect fallback -->
        <meta http-equiv="refresh" content="5;url=${redirectUrl}">
    </head>
    <body>

        <div class="status-card">
            ${icon}
            <div class="title">${title}</div>
            <p class="message">${message}</p>
            
            <div class="footer-divider">
                <p class="countdown-text">
                    Redirecting you in <span id="countdown">5</span> seconds...
                </p>
            </div>
        </div>

        <script>
            let timeLeft = 5;
            const timerElement = document.getElementById('countdown');
            const interval = setInterval(() => {
                timeLeft--;
                if (timerElement) timerElement.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(interval);
                }
            }, 1000);
        </script>
    </body>
    </html>
    `;
}

//================display event attendees============//
// Endpoint: GET /getdgrp
router.get('/getregistered', async (req, res) => {
    try {
        // Read URL variables sent by the frontend fetch request
        //const { description, ageBracket, day, time } = req.params;

        // Base query stringhow 
        let queryText = `
            SELECT 
                UPPER(CONCAT_WS(' ', CONCAT(last_name, ', '), first_name)) AS full_name, 
                email, company, event, arrived
                 
            FROM qr_jhuang
            order by last_name asc;
        `;
        const queryParams = [];

       
        // Destructure utilizing your style layout
        const [result] = await db.query(queryText /*,queryParams*/);
        
        // Respond with only matching records array
        res.status(200).json(result);

    } catch (error) {
        console.error('Database Query Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. ALWAYS export at the absolute bottom of the file
module.exports = router;