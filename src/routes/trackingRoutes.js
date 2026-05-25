const express = require('express');
const router = express.Router();
const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

router.get('/history/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    let redisLatest = null;
    let mongoHistory = [];
    try {
        const redisDataRaw = await redisClient.sendCommand(['HGET', 'drivers_status', orderId]);
        
        if (redisDataRaw && typeof redisDataRaw === 'string') {
            try {
                const parsedData = JSON.parse(redisDataRaw);
                redisLatest = {
                    latitude: parsedData.latitude || null,
                    longitude: parsedData.longitude || null,
                    status: parsedData.status || "Không xác định"
                };
            } catch (jsonErr) {
                redisLatest = { latitude: null, longitude: null, status: redisDataRaw };
            }
        }
    } catch (redisError) {
        console.error("Redis Query: Không lấy được data từ Upstash:", redisError.message);
    }
    try {
        mongoHistory = await RouteHistory.find({ orderId }).sort({ timestamp: 1 });

        res.json({
            orderId: orderId,
            redisLatestLocation: redisLatest || { latitude: null, longitude: null, status: "Chưa có dữ liệu" },
            mongoTotalPointsSaved: mongoHistory.length,
            mongoRouteHistory: mongoHistory
        });

    } catch (mongoError) {
        console.error("❌ [MongoDB Query Error]: Sập tầng kết nối Atlas:", mongoError);
        res.status(500).json({ error: "Database query failed completely" });
    }
});

module.exports = router;