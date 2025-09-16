const mongoose = require("mongoose");


const schema = new mongoose.Schema({
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'clients' },
    order_id: { 
        type: Number 
    },
    products: [{
        product_id: { 
            type: mongoose.Schema.Types.ObjectId ,
            ref:"products"
        },
        product_name: { 
            type: String 
        },
        product_category: { 
            type: String 
        },
        product_quantity: { 
            type: Number 
        },
        product_price: { 
            type: Number 
        },
        
        product_image: { 
            type: String 
        },
        product_status: { 
            type: String,
            enum:['Confirmed', 'Pending', 'Delivered', 'Returned', 'Cancelled'],
            default:'Pending'
        }
    }],
    totalQuantity: { 
        type: Number 
    },
    totalPrice: { 
        type: Number 
    },
    address: {
        customer_name: String,
        customer_emailid: String,
        building: String,
        street: String,
        city: String,
        country: String,
        pincode: Number,
        phonenumber:Number,
        landMark:String
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: [ 'Cash on delivery','razorpay', 'Wallet','credit or debit card']
    },
    isCancelled: {
        type: Boolean,
        default: false
    },
    isCoupen:{
        type: Boolean,
        default: false
    },
    coupen_id:{
            type: mongoose.Schema.Types.ObjectId ,
            ref:"coupens",
            required: false
    },
    paymentId: {
        type: String,
        required: false
    }, 
    orderStatus: { 
        type: String, 
        enum:['Confirmed', 'Pending', 'Delivered', 'Returned', 'Cancelled','Shipped','Payment Pending']
    }
},{timestamps:true})


module.exports = mongoose.model("orders", schema);