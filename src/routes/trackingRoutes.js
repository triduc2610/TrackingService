const express = require('express');
const router = express.Router();
const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

// 1. API KHỞI TẠO VẬN ĐƠN NGẦM (Nhận tín hiệu từ Order Service bắn sang)
router.post('/init', async (req, res) => {
    const { orderId, status } = req.body;
    try {
        console.log(`📡 [Tracking Service]: Nhận lệnh khởi tạo vận đơn từ OrderService cho mã: ${orderId}`);
        
        // Cache trạng thái ban đầu vào RAM Upstash Redis
        const initialData = JSON.stringify({ 
            latitude: null, 
            longitude: null, 
            status: status || "Đang chế biến", 
            updatedAt: new Date().toISOString() 
        });
        await redisClient.hSet('drivers_status', orderId, initialData);

        return res.status(200).json({ success: true, message: "Hạ tầng tracking đã sẵn sàng!" });
    } catch (err) {
        console.error("❌ Lỗi khởi tạo hệ thống vận đơn:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 2. API TRÍCH XUẤT LỊCH SỬ (Khách hàng bấm nút tra cứu trên giao diện)
router.get('/history/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    let redisLatest = null;
    let mongoHistory = [];

    try {
        // Trích xuất tầng Redis
        try {
            const redisDataRaw = await redisClient.hGet('drivers_status', orderId);
            if (redisDataRaw) {
                const parsedData = JSON.parse(redisDataRaw);
                redisLatest = {
                    latitude: parsedData.latitude || null,
                    longitude: parsedData.longitude || null,
                    status: parsedData.status || "Không xác định"
                };
            }
        } catch (redisError) {
            console.error("⚠️ [Redis Query Warning]: Không lấy được dữ liệu Redis:", redisError.message);
        }

        // Trích xuất tầng MongoDB Atlas
        mongoHistory = await RouteHistory.find({ orderId }).sort({ timestamp: 1 });

        return res.json({
            orderId: orderId,
            redisLatestLocation: redisLatest || { latitude: null, longitude: null, status: "Chưa có dữ liệu" },
            mongoTotalPointsSaved: mongoHistory.length,
            mongoRouteHistory: mongoHistory
        });

    } catch (mongoError) {
        console.error("❌ [Tracking Service API Error]: Thất bại hoàn toàn:", mongoError.message);
        return res.status(500).json({ success: false, error: "Database query failed" });
    }
});

module.exports = router;