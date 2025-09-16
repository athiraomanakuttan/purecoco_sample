const { ObjectId } = require("mongodb");
const {  mongoose } = require("mongoose");

const productSchema = new mongoose.Schema({
    product_name:{
        type:String,
        required:true,
        unique:false
    },
    product_description:{
        type:String,
        required:true
    },
    product_price:{
        type:Number,
        required:true
    }, category_name:{
        type:String,
        required:true
    },
    product_quantity:{
        type:String,
        required:true
    },
    category_id:{
        type:ObjectId,
        required:true
    },
    product_stock:{
        type:Number,
        required:true
    },
    product_image:{
        type:Array,
        required:true
    },
    product_status:{
        type:Number,
        required:true
    },
    timestamp:{
        type:Date,
        required:true,
        default:Date.now()
    },
    
})


module.exports = mongoose.model('products',productSchema)