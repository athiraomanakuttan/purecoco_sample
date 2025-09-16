const { mongoose } = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        category_name: {
            type: String,
            required: true,
            unique: false
        },

    category_status:{
        type : Number ,
        require : true,
        unique : false
        },
        timestamp:{
            type : Date,
            default: Date.now(),
            required: true
        }

})
const categoryCollection = mongoose.model('categories',categorySchema)
module.exports = categoryCollection