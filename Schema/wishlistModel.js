const { ObjectId } = require('mongodb');
const { mongoose }= require('mongoose');


const wishlistSchema = new mongoose.Schema({
    customer_id:{
        type: ObjectId,
        required: true
    },
    product_id:{
        type: ObjectId,
        required: true
    },
    wishlist_status:{
        type: Number,
        required: true,
        default: 1
    }
},{ timestamps: true })

const cartCollection = mongoose.model('wishlists', wishlistSchema)

module.exports= cartCollection 