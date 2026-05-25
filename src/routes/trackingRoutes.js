const express = require('express');
const router = express.Router();
const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

router.get('/history/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    try {
        //Get location from Redis Hash
        const redisDataRaw = await redisClient.sendCommand(['HGET', 'drivers_status', orderId]);
        
        let redisLatest = null;
        if (redisDataRaw) {
            const parsedData = JSON.parse(redisDataRaw);
            redisLatest = {
                latitude: parsedData.latitude,
                longitude: parsedData.longitude,
                status: parsedData.status
            };
        }
        
        //Search routes history
        const mongoHistory = await RouteHistory.find({ orderId }).sort({ timestamp: 1 });

        res.json({
            orderId: orderId,
            redisLatestLocation: redisLatest,
            mongoTotalPointsSaved: mongoHistory.length,
            mongoRouteHistory: mongoHistory
        });
    } catch (error) {
        console.error("Routing API error:", error);
        res.status(500).json({ error: "Data failed" });
    }
});

module.exports = router;