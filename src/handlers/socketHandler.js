const { redisClient } = require('../../config/database');
const RouteHistory = require('../models/RouteHistory');

module.exports = (io) => {
    io.on('connection', (socket) => {
        
        //Order id room start
        socket.on('join_order_track', (data) => {
            if (data && data.orderId) {
                socket.join(`order_${data.orderId}`);
                console.log(`[Socket]: Kết nối ${socket.id} đã vào phòng order_${data.orderId}`);
            }
        });

        //Update location when delievering
        socket.on('update_location', async (data) => {
            const { orderId, latitude, longitude, status } = data;
            const timestamp = new Date().toISOString();

            console.log(`\n--- [Event] Đơn hàng: ${orderId} | Trạng thái: [${status}] ---`);

            try {
                //Transfer data to redis hash
                const driverDataString = JSON.stringify({ latitude, longitude, status, updatedAt: timestamp });
                await redisClient.sendCommand(['HSET', 'drivers_status', orderId, driverDataString]);
                console.log(`Redis Hash: Saving order status ${orderId}`);

                //Record data into MongoDB
                if (status === "Đang giao hàng") {
                    const newPoint = new RouteHistory({ orderId, latitude, longitude });
                    await newPoint.save();
                    console.log(`MongoDB: Order data saved`);
                }

                //Push data to customer
                io.to(`order_${orderId}`).emit('tracking_updated', {
                    orderId, latitude, longitude, status, timestamp
                });

            } catch (err) {
                console.error("Socket Handler error:", err);
            }
        });
    });
};