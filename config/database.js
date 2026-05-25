const redis = require('redis');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://trduc261005_db_user:triduc2610!@trackingservice.ybrjrd8.mongodb.net/?appName=TrackingService';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

//MongoDB
const connectMongoDB = () => {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB: Succesful'))
    .catch(err => console.error('MongoDB: Error:', err));
}

//Redis Client
const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Error:', err));

const connectRedis = async () =>{
  await(redisClient.connect())
    console.log('Redis: Succesful')
}

module.exports = {
  connectMongoDB,
  connectRedis,
  redisClient
};