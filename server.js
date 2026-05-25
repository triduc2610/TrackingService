const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { connectMongoDB, connectRedis } = require('./config/database');
const trackingRoutes = require('./src/routes/trackingRoutes');
const initSocketHandler = require('./src/handlers/socketHandler');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

//Connect to DB
connectMongoDB();
connectRedis();

//API's route
app.use('/api/tracking', trackingRoutes);

//Socket.io and hanlde event
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
initSocketHandler(io); 

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`TRACKING SERVICE PORT: ${PORT}`);
});