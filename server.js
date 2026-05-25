const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { connectMongoDB, connectRedis } = require('./config/database');
const trackingRoutes = require('./src/routes/trackingRoutes');
const initSocketHandler = require('./src/handlers/socketHandler');

const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));
app.use(express.json());

app.get('/ping', (req, res) => {
    res.json({ message: "pong", status: "server_alive" });
});

// API's route
app.use('/api/tracking', trackingRoutes);

const server = http.createServer(app);

const io = new Server(server, { 
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

connectMongoDB();
connectRedis();

initSocketHandler(io); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`TRACKING SERVICE IS RUNNING ON PORT: ${PORT}`);
});