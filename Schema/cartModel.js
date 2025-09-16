const { ObjectId } = require('mongodb');
const { mongoose }= require('mongoose');


const cartSchema = new mongoose.Schema({
    customer_id:{
        type: ObjectId,
        required: true
    },
    product_id:{
        type: ObjectId,
        required: true
    },
    quantity:{
        type: Number,
        required: true
    },
    cart_status:{
        type: Number,
        required: true,
        default:1
    },
    timestamp:{
        type: Date,
        default:Date.now()
    }
})

const cartCollection = mongoose.model('carts',cartSchema)

module.exports= cartCollection