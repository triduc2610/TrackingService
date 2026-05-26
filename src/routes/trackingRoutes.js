const express = require('express');
const router = express.Router();
const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

// API lấy lịch sử lộ trình song song từ Redis (tức thời) và MongoDB (lịch sử)
router.get('/history/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    let redisLatest = null;
    let mongoHistory = [];

    // Bọc toàn bộ tiến trình vào một khối try-catch tổng để quản lý luồng response an toàn
    try {
        // 1. TRÍCH XUẤT TẦNG REDIS (Bộ nhớ đệm trạng thái tức thời)
        try {
            // Tối ưu hóa: Dùng .hGet trực tiếp thay cho sendCommand thô
            const redisDataRaw = await redisClient.hGet('drivers_status', orderId);
            
            if (redisDataRaw) {
                try {
                    const parsedData = JSON.parse(redisDataRaw);
                    redisLatest = {
                        latitude: parsedData.latitude || null,
                        longitude: parsedData.longitude || null,
                        status: parsedData.status || "Không xác định"
                    };
                } catch (jsonErr) {
                    // Phòng trường hợp dữ liệu trong Redis không phải chuỗi JSON hợp lệ
                    redisLatest = { latitude: null, longitude: null, status: redisDataRaw };
                }
            }
        } catch (redisError) {
            // Nếu Redis Upstash có sự cố, log lại lỗi nhưng KHÔNG làm sập API, vẫn cho phép chạy tiếp xuống Mongo
            console.error("⚠️ [Redis Query Warning]: Không lấy được dữ liệu trạng thái tức thời:", redisError.message);
        }

        // 2. TRÍCH XUẤT TẦNG MONGODB ATLAS (Lịch sử vệt lộ trình)
        // Nhờ Compound Index { orderId: 1, timestamp: 1 } chúng ta tạo ở file trước, lệnh sort này sẽ chạy cực nhanh
        mongoHistory = await RouteHistory.find({ orderId }).sort({ timestamp: 1 });

        // 3. TRẢ DỮ LIỆU ĐỒNG BỘ VỀ CHO FRONTEND APP.JS
        return res.json({
            orderId: orderId,
            redisLatestLocation: redisLatest || { latitude: null, longitude: null, status: "Chưa có dữ liệu" },
            mongoTotalPointsSaved: mongoHistory.length,
            mongoRouteHistory: mongoHistory
        });

    } catch (mongoError) {
        // Bẫy lỗi tổng lực nếu tầng kết nối cốt lõi hoặc MongoDB Atlas gặp sự cố nghiêm trọng
        console.error("❌ [Tracking Service API Error]: Xử lý request thất bại hoàn toàn:", mongoError.message);
        return res.status(500).json({ 
            success: false, 
            error: "Hệ thống trích xuất lịch sử lộ trình đang bận, vui lòng thử lại sau!" 
        });
    }
});

// Thêm API này vào file TrackingService/src/routes/trackingRoutes.js
router.post('/init', async (req, res) => {
    const { orderId, status } = req.body;
    try {
        console.log(`📡 [Tracking Service]: Nhận lệnh khởi tạo vận đơn từ OrderService cho mã: ${orderId}`);
        
        // Cache trạng thái ban đầu "Đang chế biến" vào RAM Upstash Redis
        const { redisClient } = require('../../config/database');
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

module.exports = router;