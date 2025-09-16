const { mongoose } = require('../Config/dbConnect');

const clientSchema = new mongoose.Schema(
    {
        customer_name: {
            type: String,
            required: true,
            unique: false
        },
        customer_emailid: {
            type: String,
            required: true,
            unique: true
        },
        customer_phone: {
            type: Number,
            required: true
        },
        customer_password: {
            type: String,
            required: true,
            unique: false
        },
        customer_address: [{
            building: {
                type: String,
                required: false,
                unique: false
            },
            street: {
                type: String,
                required: false,
                unique: false
            },
            city: {
                type: String,
                required: false,
                unique: false
            },
            state: {
                type: String,
                required: false,
                unique: false
            },
            country: {
                type: String,
                required: false,
                unique: false
            },
            pincode: {
                type: String,
                required: false,
                unique: false
            },
            phonenumber: {
                type: Number,
                required: false,
                unique: false
            },
            landmark: {
                type: String,
                required: false,
                unique: false
            }
        }
        ],
        customer_status: {
            type: Number,
            required: true,
            unique: false
        },
        timestamp: {
            type: Date,
            default: Date.now,
            required: true
        }
    }
);

const clientCollection = mongoose.model('clients', clientSchema);
module.exports = clientCollection;
