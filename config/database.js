const mongoose = require('mongoose');
const redis = require('redis');

// 1. Cấu hình chuỗi kết nối (Đã thêm Database Name: TrackingService để tách biệt dữ liệu)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://trduc261005_db_user:triduc2610!@trackingservice.ybrjrd8.mongodb.net/TrackingService?appName=TrackingService';
const REDIS_URL = process.env.REDIS_URL || 'rediss://default:gQAAAAAAAWJ-AAIgcDIyNjlmN2I5ZmY0MDU0MDFhOTk5NGRiYzNmMjMwMGYxMA@evolving-monkfish-90750.upstash.io:6379';

// 2. Hàm kết nối MongoDB (Đã chuyển sang async/await đồng bộ)
const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB - Tracking Service]: Kết nối thành công cơ sở dữ liệu lịch sử!');
  } catch (err) {
    console.error('[MongoDB - Tracking Service Error]: Lỗi kết nối:', err.message);
    process.exit(1); // Ngắt tiến trình lập tức nếu lỗi DB để hệ thống dễ kiểm soát
  }
}

// 3. Cấu hình bộ cấu trúc tùy chọn cho Redis Client
const redisOptions = { url: REDIS_URL };

if (REDIS_URL.startsWith('rediss://')) {
    redisOptions.socket = {
        tls: true,
        rejectUnauthorized: false
    };
}

const redisClient = redis.createClient(redisOptions);

// Lắng nghe bắt lỗi kết nối từ Redis Server
redisClient.on('error', (err) => console.error('❌ [Redis Error]:', err.message));

// 4. Hàm kết nối Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('[Redis - Tracking Service]: Kết nối thành công bộ nhớ đệm trạng thái!');
  } catch (err) {
    console.error('[Redis - Tracking Service Error]: Không thể kết nối tới Upstash:', err.message);
  }
}

module.exports = {
  connectMongoDB,
  connectRedis,
  redisClient
};