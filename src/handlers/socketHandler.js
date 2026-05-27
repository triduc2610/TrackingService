const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

module.exports = (io) => {
    io.on('connection', (socket) => {
        
        //Client join order room
        socket.on('join_order_track', (data) => {
            if (data && data.orderId) {
                socket.join(`order_${data.orderId}`);
                console.log(`[Socket]: Kết nối ${socket.id} đã vào phòng order_${data.orderId}`);
            }
        });

        //update location 
        socket.on('update_location', async (data) => {
            const { orderId, latitude, longitude, status } = data;
            const timestamp = new Date().toISOString();

            console.log(`\n--- [Event] Đơn hàng: ${orderId} | Trạng thái: [${status}] ---`);

            try {
                const driverDataString = JSON.stringify({ latitude, longitude, status, updatedAt: timestamp });
                
                await redisClient.hSet('drivers_status', orderId, driverDataString);
                console.log(`Redis Hash: Đã cập nhật trạng thái cache cho đơn ${orderId}`);

                if (status === "Đang giao hàng" || status === "Đã hoàn thành") {
                    const newPoint = new RouteHistory({ orderId, latitude, longitude });
                    await newPoint.save();
                    console.log(`MongoDB: Đã ghi nhận 1 điểm tọa độ mới vào lịch sử hành trình [${status}].`);
                }
                io.to(`order_${orderId}`).emit('tracking_updated', {
                    orderId, 
                    latitude, 
                    longitude, 
                    status, 
                    timestamp
                });

            } catch (err) {
                console.error("[Socket Handler Error]: Luồng xử lý sự kiện thất bại:", err.message);
            }
        });
    });
};