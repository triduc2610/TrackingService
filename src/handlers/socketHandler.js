const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

module.exports = (io) => {
    io.on('connection', (socket) => {
        
        // 1. Khách hàng/Tài xế tham gia vào phòng (Room) riêng của đơn hàng
        socket.on('join_order_track', (data) => {
            if (data && data.orderId) {
                socket.join(`order_${data.orderId}`);
                console.log(`[Socket]: Kết nối ${socket.id} đã vào phòng order_${data.orderId}`);
            }
        });

        // 2. Lắng nghe dòng sự kiện cập nhật tọa độ liên tục từ GPS Tài xế
        socket.on('update_location', async (data) => {
            const { orderId, latitude, longitude, status } = data;
            const timestamp = new Date().toISOString();

            console.log(`\n--- [Event] Đơn hàng: ${orderId} | Trạng thái: [${status}] ---`);

            try {
                // Tách biệt dữ liệu driver để đưa vào Redis lưu trạng thái tức thời
                const driverDataString = JSON.stringify({ latitude, longitude, status, updatedAt: timestamp });
                
                // Tối ưu hóa: Dùng .hSet trực tiếp của thư viện redis v4
                await redisClient.hSet('drivers_status', orderId, driverDataString);
                console.log(`Redis Hash: Đã cập nhật trạng thái cache cho đơn ${orderId}`);

                // SỬA LỖI TẠI ĐÂY: Lưu cả điểm "Đang giao hàng" và điểm đích "Đã hoàn thành" vào MongoDB
                if (status === "Đang giao hàng" || status === "Đã hoàn thành") {
                    const newPoint = new RouteHistory({ orderId, latitude, longitude });
                    await newPoint.save();
                    console.log(`MongoDB: Đã ghi nhận 1 điểm tọa độ mới vào lịch sử hành trình [${status}].`);
                }

                // Phát tín hiệu thời gian thực (Real-time Broadcast) về cho phòng của đơn hàng (Khách hàng xem)
                io.to(`order_${orderId}`).emit('tracking_updated', {
                    orderId, 
                    latitude, 
                    longitude, 
                    status, 
                    timestamp
                });

            } catch (err) {
                console.error("❌ [Socket Handler Error]: Luồng xử lý sự kiện thất bại:", err.message);
            }
        });
    });
};