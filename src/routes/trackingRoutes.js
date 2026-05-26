const express = require('express');
const router = express.Router();
const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

// 1. API KHỞI TẠO VẬN ĐƠN NGẦM (Nhận tín hiệu từ Order Service bắn sang)
router.post('/init', async (req, res) => {
    const { orderId, status } = req.body;
    
    try {
        console.log(`📡 [Tracking Service]: Nhận lệnh khởi tạo vận đơn từ OrderService cho mã: ${orderId}`);
        
        // 🔥 ĐOẠN ĐÃ KHẮC PHỤC: Định nghĩa lại chuỗi JSON ban đầu (Bị thiếu trong code của bạn)
        const initialData = JSON.stringify({ 
            latitude: null, 
            longitude: null, 
            status: status || "Đang chế biến", 
            updatedAt: new Date().toISOString() 
        });

        // Ép kiểu chắc chắn orderId và initialData là String để bảo vệ Driver Redis
        await redisClient.hSet('drivers_status', String(orderId), String(initialData));
        console.log(`✅ [Redis]: Đã nạp cache trạng thái cho đơn ${orderId}`);

        // 🔥 ĐOẠN ĐÃ KHẮC PHỤC: Bắt buộc phải trả về JSON để Order Service nhận được (Bị thiếu trong code của bạn)
        return res.status(200).json({ 
            success: true, 
            message: "Hạ tầng tracking đã sẵn sàng!" 
        });

    } catch (redisWriteError) {
        console.error("❌ Lỗi khởi tạo hệ thống vận đơn:", redisWriteError.message);
        
        // Trả về JSON lỗi cấu trúc sạch sẽ để Order Service không bị crash luồng HTTP
        return res.status(500).json({ 
            success: false, 
            error: "Hạ tầng bộ nhớ đệm tạm thời không phản hồi", 
            details: redisWriteError.message 
        });
    }
});

// 2. API TRÍCH XUẤT LỊCH SỬ (Khách hàng bấm nút tra cứu trên giao diện)
router.get('/history/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    let redisLatest = null;
    let mongoHistory = [];

    try {
        // Trích xuất tầng Redis (Đọc cô lập, nếu lỗi Redis vẫn chạy tiếp xuống Mongo)
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