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
    newCreatePDF: async ( empid, empname, region, position, addy, datehired, res )=>{

        console.log('pdf param', empid, empname, region, position, addy, datehired )

        const totalRecords = 0;
        const recordsPerPage = 20;
        const totalPages = Math.ceil(totalRecords / recordsPerPage) + 1;

        // Load logo as base64
        //const logoPath = path.join(__dirname, 'besi_main_logo.jpg');
        //const logoImage = fs.readFileSync(logoPath).toString('base64');

        // === 2. REPLACE THIS BLOCK with the new fetch logic ===
        // You currently have:
        // const signatureImage = `https://asianowapp.com/html/ncr_smnl_emp/SIGN_${empid}.png`
        // const HOSTINGER_SIGNATURE_URL = signatureImage; // Make sure this is the correct, full URL
        // let signatureBase64 = '';
        // try { /* ... your fetch and base64 code ... */ }
        // catch (signatureError) { /* ... error handling ... */ }
        //
        // Replace it with this more robust and directly integrated version:

        let regionName

        switch ( region.toLowerCase() ) { // Use regionParam from URL  
            case 'smnl': regionName = 'ncr_smnl_emp'; break;
            case 'cmnl': regionName = 'ncr_cmnl_emp'; break;
            case 'nelu': regionName = 'ncr_nelu_emp'; break;
            case 'nwlu': regionName = 'ncr_nwla_emp'; break;
            case 'cmnva': regionName = 'ncr_cmnva_emp'; break;
            case 'bcol': regionName = 'bsl_bicol_emp'; break;
            case 'smlyte': regionName = 'bsl_smarleyte_emp'; break;
            case 'bcld': regionName = 'wvis_bacolod_emp'; break;
            case 'panay': regionName  = 'wvis_panay_emp'; break;
        }//endsw

        const signatureImageUrl = `https://asianowapp.com/html/${regionName}/SIGN_${empid}.png`; // Construct the URL dynamically
        // const logomainUrl = `https://asianowapp.com/html/logomain.png`; // Construct the URL dynloamically
        // const logosmallUrl = `https://asianowapp.com/html/logosmall.jpg`; // Construct the URL dynamica/lly

        let signatureBase64 = ''; // This variable will hold the Base64 string or remain empty on error

        try {
        console.log(`Attempting to fetch signature from: ${signatureImageUrl}`);
        const signatureResponse = await fetch(signatureImageUrl);

        if (!signatureResponse.ok) {
            throw new Error(`Failed to fetch signature image: ${signatureResponse.status} ${signatureResponse.statusText}`);
        }

        // THIS IF FOR THE logO
        // const logomainResponse = await fetch( logomainUrl);
        // const aBuffer = await logomainResponse.arrayBuffer();
        // const logomainBuffer = Buffer.from(aBuffer);

        // logomainBase64 = `data:image/png;base64,${logomainBuffer.toString('base64')}`;
        
        // const logosmallResponse = await fetch( logosmallUrl);
        // const aBuffer2 = await logosmallResponse.arrayBuffer();
        // const logosmallBuffer = Buffer.from(aBuffer2);

        // logosmallBase64 = `data:image/png;base64,${logosmallBuffer.toString('base64')}`;


        // ====THIS IS FOR SIGNATURE
        const arrayBuffer = await signatureResponse.arrayBuffer();
        const signatureBuffer = Buffer.from(arrayBuffer);

        signatureBase64 = `data:image/png;base64,${signatureBuffer.toString('base64')}`;
        console.log('Signature image fetched and converted to Base64 successfully.');
        } catch (signatureError) {
        console.error('ERROR: Could not fetch or process signature from Hostinger:', signatureError);
        signatureBase64 = '';
        }

        console.log('Signature base64 length:', signatureBase64.length);

        // try {
        //     console.log(`Attempting to fetch signature from: ${signatureImageUrl}`);
        //     const signatureResponse = await fetch(signatureImageUrl);

        //     if (!signatureResponse.ok) {
        //         // If the fetch was unsuccessful (e.g., 404 Not Found, 500 Server Error)
        //         throw new Error(`Failed to fetch signature image: ${signatureResponse.status} ${signatureResponse.statusText}`);
        //     }

        //     const signatureBuffer = await signatureResponse.buffer(); // Get the image data as a Buffer
        //     // IMPORTANT: Specify the correct MIME type for the signature image.
        //     // Assuming it's a PNG based on the URL extension. Adjust if it's JPEG etc.
        //     signatureBase64 = `data:image/png;base64,${signatureBuffer.toString('base64')}`;
        //     console.log('Signature image fetched and converted to Base64 successfully.');

        // } catch (signatureError) {
        //     // If fetching or processing the signature image fails
        //     console.error('ERROR: Could not fetch or process signature from Hostinger:', signatureError.message);
        //     signatureBase64 = ''; // Keep it empty, so the HTML can render a fallback message
        // }
        // === END OF REPLACED BLOCK ===

        const fontmain = '9px' //orig is 10jpx
        const fontaddy = '9px'
        const fonttable='8px'

        let xfile
        //=== CREATE PDF ===========
        switch(position){
            case '01' : //rider
                xfile = 'transporter.html';
            break;
            case '02' : //transporter
                xfile = 'transporter.html';
            break;
            case '04' : // sorter
                xfile = 'sorter.html';
            break;
            case '08' : //coordinator
                xfile = 'coordinator.html';
            break;
            
        }//endsw

        /**** LOAD HTML TEMPLATE AND LOGOS */
        let htmlx = fs.readFileSync(path.join(__dirname, xfile), "utf8");

        const bitmap1 = fs.readFileSync(path.join(__dirname, "logomain.png"));
        const logomain = bitmap1.toString('base64');
        
        const bitmap2 = fs.readFileSync(path.join(__dirname, "logosmall.jpg"));
        const logosmall = bitmap2.toString('base64');
            
        let options = {
            //format: "A4",
            format: "Legal",
            orientation: "portrait",
            border: "5mm",
            
            footer:{
                height: '6mm',
                contents: {
                default: `
                    <div style="font-size:8px; width:100%; text-align:center; border-top:1px solid #000; padding-top:3px;">
                    Page {{page}} of {{pages}}
                    </div>
                `
                }
            }
        }//====end options

        const pdfData = {
            logomain  : logomain,
            logosmall : logosmall,
            signature : signatureBase64,
            empname   : empname,
            addy      : addy,
            datehired : datehired
        };

        const template = hbar.compile(htmlx);
        const content = template(pdfData);

        //.tostream is to stream esp for downloading
        //.toFile is to save a pdf in path then download
        pdf.create(content, options).toStream((err, stream) => {
        
            if (err) return res.status(500).send(err);
            console.log('done processing PDF');

            res.setHeader('Content-Disposition', `attachment; filename=${empid}.pdf`);
            res.setHeader('Content-Type', 'application/pdf');
            stream.pipe(res);
        });

    },
}//======end module export 
