const mongoose = require('mongoose');
const redis = require('redis');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://trduc261005_db_user:triduc2610!@trackingservice.ybrjrd8.mongodb.net/?appName=TrackingService';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connectMongoDB = () => {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB: Kết nối thành công'))
    .catch(err => console.error('MongoDB: Lỗi kết nối:', err));
}

const redisOptions = { url: REDIS_URL };

if (REDIS_URL.startsWith('rediss://')) {
    redisOptions.socket = {
        tls: true,
        rejectUnauthorized: false
    };
}

const redisClient = redis.createClient(redisOptions);

redisClient.on('error', (err) => console.error('Redis Error:', err));

const connectRedis = async () => {
  await redisClient.connect();
  console.log('Redis: Kết nối thành công bộ nhớ đệm trạng thái!');
}

module.exports = {
  connectMongoDB,
  connectRedis,
  redisClient
};