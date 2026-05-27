const express = require('express');
const router = express.Router();
const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

// 1. API KHOI TAO VAN DON NGAM (Nhan tin hieu tu Order Service ban sang)
router.post('/init', async (req, res) => {
    const { orderId, status } = req.body;
    
    try {
        console.log(`[Tracking Service]: Nhan lenh khoi tao van don tu OrderService cho ma: ${orderId}`);
        
        // Dinh nghia chuoi JSON trang thai ban dau
        const initialData = JSON.stringify({ 
            latitude: null, 
            longitude: null, 
            status: status || "Dang che bien", 
            updatedAt: new Date().toISOString() 
        });

        // Ep kieu String de bao ve Driver Redis
        await redisClient.hSet('drivers_status', String(orderId), String(initialData));
        console.log(`[Redis]: Da nap cache trang thai cho don ${orderId}`);

        // Tra phan hoi JSON ve cho Order Service
        return res.status(200).json({ 
            success: true, 
            message: "Ha tang tracking da san sang!" 
        });

    } catch (redisWriteError) {
        console.error("[Tracking Service Error]: Loi khoi tao he thong van don:", redisWriteError.message);
        
        // Tra ve JSON loi cau truc de Order Service khong bi crash luong HTTP
        return res.status(500).json({ 
            success: false, 
            error: "Ha tang bo nho dem tam thoi khong phan hoi", 
            details: redisWriteError.message 
        });
    }
});

// 2. API TRICH XUAT LICH SU (Khach hang bam nut tra cuu tren giao diện)
router.get('/history/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    let redisLatest = null;
    let mongoHistory = [];

    try {
        // Trich xuat tang Redis (Doc co lap, neu loi Redis van chay tiep xuong Mongo)
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

        // Trich xuat tang MongoDB Atlas
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