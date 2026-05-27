const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { connectMongoDB, connectRedis } = require('./config/database');
const trackingRoutes = require('./src/routes/trackingRoutes');
const initSocketHandler = require('./src/handlers/socketHandler');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/ping', (req, res) => {
    return res.json({ message: "pong", status: "server_alive" });
});

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

initSocketHandler(io); 

const PORT = process.env.PORT || 5001; 

const startServer = async () => {
    try {
        console.log('[System]: Đang thiết lập kết nối tới các hệ thống cơ sở dữ liệu...');
        
        await connectMongoDB();
        await connectRedis();
        
        server.listen(PORT, () => {
            console.log(`[TRACKING SERVICE LIVE]: SERVER ĐANG CHẠY TẠI CỔNG VÀ MẠNG THỜI GIAN THỰC: ${PORT}`);
        });
    } catch (error) {
        console.error('[System Crash]: Khởi động Tracking Service thất bại:', error.message);
        process.exit(1); 
    }
};

startServer();