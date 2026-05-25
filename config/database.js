const redis = require('redis');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/tracking_db';
const REDIS_URL ='redis://localhost:6379';

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