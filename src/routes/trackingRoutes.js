const express = require('express');
const router = express.Router();
const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

// API create order
router.post('/init', async (req, res) => {
    const { orderId, status } = req.body;
    
    try {
        console.log(`[Tracking Service]: Nhan lenh khoi tao van don tu OrderService cho ma: ${orderId}`);
        
        const initialData = JSON.stringify({ 
            latitude: null, 
            longitude: null, 
            status: status || "Dang che bien", 
            updatedAt: new Date().toISOString() 
        });
        await redisClient.hSet('drivers_status', String(orderId), String(initialData));
        console.log(`[Redis]: Da nap cache trang thai cho don ${orderId}`);

        return res.status(200).json({ 
            success: true, 
            message: "Ha tang tracking da san sang!" 
        });

    } catch (redisWriteError) {
        console.error("[Tracking Service Error]: Loi khoi tao he thong van don:", redisWriteError.message);

        return res.status(500).json({ 
            success: false, 
            error: "Ha tang bo nho dem tam thoi khong phan hoi", 
            details: redisWriteError.message 
        });
    }
});

// Api for route history
router.get('/history/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    let redisLatest = null;
    let mongoHistory = [];

    try {
        try {
            const redisDataRaw = await redisClient.hGet('drivers_status', orderId);
            if (redisDataRaw) {
                const parsedData = JSON.parse(redisDataRaw);
                redisLatest = {
                    latitude: parsedData.latitude || null,
                    longitude: parsedData.longitude || null,
                    status: parsedData.status || "Khong xac dinh"
                };
            }
        } catch (redisError) {
            console.warn("[Redis Query Warning]: Khong lay duoc du lieu Redis:", redisError.message);
        }
        mongoHistory = await RouteHistory.find({ orderId }).sort({ timestamp: 1 });

        return res.json({
            orderId: orderId,
            redisLatestLocation: redisLatest || { latitude: null, longitude: null, status: "Chua co du lieu" },
            mongoTotalPointsSaved: mongoHistory.length,
            mongoRouteHistory: mongoHistory
        });

    } catch (mongoError) {
        console.error("[Tracking Service API Error]: That bai hoan toan:", mongoError.message);
        return res.status(500).json({ success: false, error: "Database query failed" });
    }
});

module.exports = router;