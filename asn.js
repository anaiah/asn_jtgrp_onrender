//get express js
const express = require('express')
const app = express()

// 1. CRITICAL FOR CLOUDFLARE: Tells Express it is behind a proxy (Cloudflare -> Render)
// This must be declared right after initializing express
app.set('trust proxy', 1);

const bodyParser = require('body-parser')
const cors = require('cors') // Import standard cors package

// in some file
const EventEmitter = require('events');
const bus = new EventEmitter();  // or perhaps your class
bus.setMaxListeners(20)

//======== for db connection
const db  = require('./db')
const { connectDb, closeDb } = require('./db')

const http = require('http')

//===== for socket.io
const server_https = http.createServer(app);

// 2. STABLE CORS FOR SOCKET.IO: Define explicit domains to allow instead of a wildcard
const allowedOrigins = [
  'https://asianowapp.com',
  'https://www.asianowapp.com',
  //'https://app.vantaztic.com',
  //'https://osndp1.onrender.com'
];

//const io = new Server(server_https);
const io = require("socket.io")( server_https, {
    transports:['websocket','polling'],
    cors: {
      origin: "*", //bring back to https://asianowapp.com
      methods: ["GET", "POST","PUT","DELETE"],
      //allowedHeaders: ["vantaztic-header"],
      //credentials: true
    }
  })

const path = require('path')

//=======================
//important, tell express that the data returned is json
app.use(express.json({limit: '50mb'})) 
app.use(express.urlencoded({limit: '50mb', extended:true}))

// to support URL-encoded bodies
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({limit: '50mb', extended:false}))

// 3. SECURE EXPRESS CORS MIDDLEWARE: Handles preflight rules properly for Cloudflare
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS block by Express API'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

//======== END NODEJS CORS SETTING
const getRandomPin = (chars, len)=>[...Array(len)].map(
    (i)=>chars[Math.floor(Math.random()*chars.length)]
 ).join('');
 
app.get('/test',(req, res)=>{
    const apitest = getRandomPin('0123456789',6)
    console.log(apitest, ' API Ready to Serve')
    res.status(200).send(`${apitest} API ready to serve!`)
})

db.connectDb()
  .then(con => {
    console.log('BETTER EDGE J&T GROUP DATABASE CONNECTED!');
    db.closeDb(con);
  })
  .catch(err => {
    console.error('DB connection failed:', err);
  });

//===============Main Routes
const usersRouter = require('./routes/api')(io);
app.use('/', usersRouter);

//===============coordinator/head routes=======
const coordRouter = require('./routes/coor');
app.use('/coor', coordRouter);

const headcoordRouter = require('./routes/headcoor');
app.use('/headcoor', headcoordRouter);

const opmgrRouter = require('./routes/opmgr');
app.use('/opmgr', opmgrRouter);

const cookieParser = require('cookie-parser');
app.use(cookieParser())

//===== socket.io connect
let listClient = []
let nLogged = 0
let xmsg
let userMode, userName 

let connectedSockets = []

//listen socket.io
io.on('connection', (socket) => {

    if(socket.handshake.query.userName){
		const userNames = socket.handshake.query.userName
		const userNamex = JSON.parse(userNames)
		userName = userNamex.token
		
		userMode = userNamex.mode
        userId = userNamex.emp_id

		console.log('mode==', userMode)
				
		connectedSockets.push({
				socketId: socket.id,
				mode: userMode,
                emp_id: userId,
				userName
		})		
				
		nLogged++
				
		console.log('*** NEW BETTER EDGE J&T GROUP  SOCKET.IO SERVICES STARTED ***\n', connectedSockets)	
		
		console.log(`NEW BETTER EDGE J&T GROUP 12142K24 Connected ${nLogged}`)
	}

    socket.on('sendtoOpMgr', (data) => {
        let xdata = data
        connectedSockets.forEach(socketInfo => {
            if(parseInt(socketInfo.mode)===5){
               socket.to( socketInfo.socketId ).emit('loadchart', data ) 
               console.log(`Fired Event 'loadchart' to USER: ${socketInfo.userName}, ID: ${socketInfo.socketId }`)
            }
        })
    })

    socket.on('init', (data) => {
        let xdata = data
        const finder = connectedSockets.findIndex( x => x.mode==5)

        if(finder >= 0){ 
            socket.to( connectedSockets[finder].socketId).emit('xinit', data )
            console.log('@@@initially found opmgr', connectedSockets[finder].socketId)
        }

        if(finder ==-1){
            socket.emit('noconnect', data)
        }
    })

    io.emit('logged',`User connected: ${nLogged }`)
    console.log(`user connected ${nLogged}`)
    
    socket.on('disconnect', (id) => {
		console.log('disconnecting....')
		nLogged--
		if(nLogged <= 0){
			nLogged = 0
		}
        const togo = connectedSockets.findIndex( x => x.socketId === socket.id)
        if(togo !== -1) {
            connectedSockets.splice(togo, 1)
        }
        console.log(connectedSockets)
        console.log(`AsiaNow User Connected ${nLogged}`)
    })
    
})

const PORT = process.env.PORT||10000 

server_https.listen( PORT ,()=>{
    console.log(`BETTER EDGE J&T GROUP API -- ALIVE AND listening to port ${PORT}`)
})
