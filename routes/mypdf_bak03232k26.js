const fs = require('fs');
const pdf = require('html-pdf');
const hbar = require('handlebars');
const sharp = require('sharp')
const path = require('path');
const { totalmem } = require('os');

// === 1. ADD THIS IMPORT ===
const fetch = require('node-fetch'); // Install: npm install node-fetch if not already


module.exports =  {
    
    //==== this is the final
    newCreatePDF: async ( empid, empname, region, res )=>{
        const totalRecords = 0;
        const recordsPerPage = 20;
        const totalPages = Math.ceil(totalRecords / recordsPerPage) + 1;

        // Load logo as base64
        const logoPath = path.join(__dirname, 'besi_main_logo.jpg');
        const logoImage = fs.readFileSync(logoPath).toString('base64');

        // === 2. REPLACE THIS BLOCK with the new fetch logic ===
        // You currently have:
        // const signatureImage = `https://asianowapp.com/html/ncr_smnl_emp/SIGN_${empid}.png`
        // const HOSTINGER_SIGNATURE_URL = signatureImage; // Make sure this is the correct, full URL
        // let signatureBase64 = '';
        // try { /* ... your fetch and base64 code ... */ }
        // catch (signatureError) { /* ... error handling ... */ }
        //
        // Replace it with this more robust and directly integrated version:

         switch ( regionParam.toLowerCase() ) { // Use regionParam from URL  
            case 'smnl': regionName = 'ncr_smnl_emp'; break;
            case 'cmnl': regionName = 'ncr_cmnl_emp'; break;
            case 'nelu': regionName = 'ncr_nelu_emp'; break;
            case 'nwlu': regionName = 'ncr_nwla_emp'; break;
            case 'cmnva': regionName = 'ncr_cmnva_emp'; break;
            case 'bcol': regionName = 'bsl_bicol_emp'; break;
            case 'smlyte': regionName = 'bsl_smarleyte_emp'; break;
            case 'cvis': regionName = 'cvis_emp'; break;
            case 'bcld': regionName = 'wvis_bacolod_emp'; break;
            case 'panay': regionName  = 'wvis_panay_emp'; break;
        }//endsw

        const signatureImageUrl = `https://asianowapp.com/html/${regionName}/SIGN_${empid}.png`; // Construct the URL dynamically

        let signatureBase64 = ''; // This variable will hold the Base64 string or remain empty on error
        try {
            console.log(`Attempting to fetch signature from: ${signatureImageUrl}`);
            const signatureResponse = await fetch(signatureImageUrl);

            if (!signatureResponse.ok) {
                // If the fetch was unsuccessful (e.g., 404 Not Found, 500 Server Error)
                throw new Error(`Failed to fetch signature image: ${signatureResponse.status} ${signatureResponse.statusText}`);
            }

            const signatureBuffer = await signatureResponse.buffer(); // Get the image data as a Buffer
            // IMPORTANT: Specify the correct MIME type for the signature image.
            // Assuming it's a PNG based on the URL extension. Adjust if it's JPEG etc.
            signatureBase64 = `data:image/png;base64,${signatureBuffer.toString('base64')}`;
            console.log('Signature image fetched and converted to Base64 successfully.');

        } catch (signatureError) {
            // If fetching or processing the signature image fails
            console.error('ERROR: Could not fetch or process signature from Hostinger:', signatureError.message);
            signatureBase64 = ''; // Keep it empty, so the HTML can render a fallback message
        }
        // === END OF REPLACED BLOCK ===


        const fontmain = '9px' //orig is 10jpx
        const fontaddy = '9px'
        const fonttable='8px'

        //=== CREATE PDF ===========
        let htmlContent = `
            <!DOCTYPE html><html lang="en"><head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document</title><style>
            
            body {
                font-family: 'Arial', sans-serif;
                font-size: ${fontmain};
            }
            .addy{
                font-size: ${fontmain};
            }
            table.blueTable {
            font-family: "Courier New", Courier, monospace;
            border: 0px solid #1C6EA4;
            /*background-color: #fff8f8ff*/
            width: 100%;
            border-collapse: collapse;
            }
            table.blueTable td, table.blueTable th {
            border: 1px solid #AAAAAA;
            padding: 3px 2px;
            
            }
            table.blueTable tbody td {
            font-size: 7px;
            color: #333333;
            border: 1px solid #D0E4F5;
            }
            table.blueTable thead {
            background: #C1B9B8;
            border-bottom: 0px solid black;
            }
            table.blueTable thead th {
            font-size: 8px;
            text-align:center;
            font-weight: bold;
            color: #3B3B3B;
            border-left: 1px solid #D0E4F5;
            }
            table.blueTable thead th:first-child {
            border-left: none;
            }
            .pagex{
                font-size:7px;
            }

            .mycontainer{
                font-size :8px;
            }
            
            .record-group {
                font-size:7px;
                display: block; /* Default, kept for clarity */
                /* optional margin for clarity in debugging */
                /* margin-bottom: 10px; */
            }
        
            .page-break {
                page-break-after: always;
                break-inside: avoid;
            }

            hr{
                border:none;
                height:1px;
                background-color:#000000;
                margin:20px auto;
            }
        </style>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    
        </head>
        <body>`;

        //=========GENERATE THE FIRST PAGE 
        htmlContent += `
        <div class="pagex ">
                <div  class="mb-2">
                    <div style="text-align:center"> 
                        <img src="data:image/png;base64,${logoImage}" height="29px" /><br>
                        <span class="addy">
                        <B>Better Edge Solutions Inc.</B><br>
                        Textron Building<br>
                        168 Luna Mencias St. Bgy. Addition Hills, San Juan 1500, Metro Manila<br>
                        </span>
                        <hr>
                    </div>
                </div>
            
                <div class="" style="text-align:center; width:100%;">
                
                    <span>
                    <b>FORMULARYO NG PAGKILALA</b>
                    </span>
                </div>

                <br><br><br><br>

                <b></b><br><br><br>
                Ako <b>${empname}</b>, ay kinikilala at pinatutunayan na
hindi ko pa lubusang naisusumite ang lahat ng mga kinakailangang dokumento para sa preemployment (Mga Government ID gaya ng SSS, Philhealth, HDMF, TIN numbers) na kailangan para sa
aking regular na pagtatrabaho sa Better Edge Solutions Inc.<br><br>

Dahil dito, hangga’t hindi ko pa lubusang natutugunan ang mga nasabing kinakailangan, ang aking
estado sa kasalukuyang kumpanya ay mananatiling pansamantala bilang isang Independent
Contractor.<br><br>
Buong kamalayan kong tinatanggap na ang mga kakulangang ito ay aking personal na
responsibilidad. Nauunawaan ko rin at pinagtitibay ang mga sumusunod:<br><br>
&nbsp;1. Mga Patakaran at Proseso<br>
 &nbsp;&nbsp; a. Mga protocol sa kaligtasan<br>
  &nbsp;&nbsp;b. Mga kasunduan sa pagiging kumpidensyal<br>
  &nbsp;&nbsp;c. Proteksyon sa Datos<br>
2. Proseso ng Bayad at Allowance<br>
  &nbsp;&nbsp;a. Cutoff<br>
  &nbsp;&nbsp;b. Pagbibigay ng Komisyon<br>
  &nbsp;&nbsp;c. Allowance (kung naaangkop)<br>
  &nbsp;&nbsp;d. Boluntaryong kaltas (Shared Capital at Buwanang Ambag para sa Sakay, kung naaangkop)<br>
 e. 2% Buwis<br>
3. Mga Scheme ng Insentibo (kung naaangkop)<br>
4. Insurance mula sa Action Sphere Network Service Cooperative (kung naaangkop)<br>
Nauunawaan ko rin na ang hindi pagsunod sa mga patakaran at proseso ng organisasyon ay
maaaring magresulta sa disiplina, kabilang ang pagwawakas ng kontrata o iba pang naaangkop na
hakbang.<br>
Sa pamamagitan ng pagpirma sa formularyo ng pagkilala, pinagtitibay ko na nauunawaan ko ang
impormasyong ibinigay.<br>`

             
                
                htmlContent+=`</div>

                <div class="mt-3">
                    <br><br><br><br><br>
                    
                    <!-- === 3. REPLACE THIS LINE with the new conditional rendering === -->
                    <!-- You currently have: -->
                    <!-- <img src="data:image/png;base64,${signatureBase64}" width="300px" height="50px" /><br> -->
                    <!-- Replace it with this block: -->
                    ${signatureBase64 // Check if signatureBase64 has a value
                        ? `<img src="${signatureBase64}" width="300px" height="50px" /><br>` // If yes, render the image
                        : `<p style="text-align:center; width:300px; border-top: 1px solid black; padding-top: 5px;">(Signature not available for ${empid})</p>` // If no, render a fallback message
                    }
                    <!-- === END OF REPLACED LINE === -->


                    <p style="width:45% ; display: table;">
                        
                        <span style="text-align:center; display: table-cell; width:45%; border-top: 1px solid black;">
                        <b>Pangalan at Lagda ng Employee / Contractor</b></span>
                        
                    </p>
                </div>

            </div>
            </div>
            <!--//end my container//-->

            <div class="page-break"></div>
            <!--//=========GENERATE THE SECOND PAGE//-->
            <div  class="mb-2">
                    <div style="text-align:center"> 
                        <img src="data:image/png;base64,${logoImage}" height="29px" /><br>
                        <span class="addy">
                        <B>Better Edge Solutions Inc.</B><br>
                        Textron Building<br>
                        168 Luna Mencias St. Bgy. Addition Hills, San Juan 1500, Metro Manila<br>
                        </span>
                        <hr>
                    </div>
                </div>
            
                    
        
        </body>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>

        </html>`;

        let options = {
            format: "A4",
            orientation: "portrait",
            border: "5mm",
            header: {
                height: "5mm"
            }, 
            footer: {
                height: "9mm",
                contents: {
                    //first: '<span class="pagex">Page 1</span>',
                    //2: '<span class="pagex">Page 2</span>',// Any page number is working. 1-based index
                    default: '<span class="pagex">Page {{page}} of '+ totalPages +'</span>', // fallback value
                    last: 'Last Page' 
                }
            }
        }//====end options


        //.tostream is to stream esp for downloading
        //.toFile is to save a pdf in path then download
        pdf.create(htmlContent, options).toStream((err, stream) => {
        
            if (err) return res.status(500).send(err);
            
            res.setHeader('Content-Disposition', `attachment; filename=${empid}.pdf`);
            res.setHeader('Content-Type', 'application/pdf');
            stream.pipe(res);
        });

    },
}//======end module export 
