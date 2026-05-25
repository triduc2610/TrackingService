const mongoose = require('mongoose');

const RouteHistorySchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        required: true,
        index: true
    },
    latitude: { 
        type: Number, 
        required: true 
    },
    longitude: { 
        type: Number, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});
module.exports = mongoose.model('RouteHistory', RouteHistorySchema);