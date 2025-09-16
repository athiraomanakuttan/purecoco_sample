const { default: mongoose } = require("mongoose");

const coupenSchema = new mongoose.Schema({
    coupen_name: {
        type: String,
        required: true,
        unique: false
    },
    coupen_code:{
        type: String,
        required: true,
        unique: true
    },
    coupen_amount_limit:{
        type: Number,
        required:true,
        default: 0
    },
    coupen_offer_amount:{
        type: Number,
        required:true,
        default: 0
    },
    coupen_expiry:{
        type: Date
    },
    coupen_type:{
        type:String,
        enum:['Flat OFF','Percentage']
    },
    coupen_status:{
        type: Number,
        required: true,
        default : 1
    }
},{timestamps:true})

module.exports = mongoose.model('coupens',coupenSchema)