
const mongoose = require('mongoose')

const offerSchema = mongoose.Schema({
    offer_name: {
        type: String,
        required: true
    },
    offer_type: {
        type: String,
        required: true,
        enum: ['Product', 'Category']
    },
    category_id: { // Ensure this field name is correct
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categories'
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'products'
    },
    offer_percentage: {
        type: Number,
        required: true
    },
    offer_expiry: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('offers', offerSchema);