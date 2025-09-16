const offerCollection = require('../../Schema/offerSchema')
const productCollection = require('../../Schema/productModel')
const categoryCollection = require('../../Schema/categoryModel');
const { ObjectId } = require('mongodb');
let GlobalNotification = {}

const getOffer = async (req, res) => {
    const category = req.query.category || "";
    const order = req.query.order || "";
    const searchStr = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let notification = {};
    if (GlobalNotification.status) {
        notification = GlobalNotification;
        GlobalNotification = {};
    }

    let search = {}, sort = {};

    if (category && order) {
        sort[category] = order === 'asc' ? 1 : -1;
    } else {
        sort = { createdAt: -1 };
    }

    if (searchStr) {
        search = { offer_name: { $regex: searchStr, $options: "i" } };
    }

    await checkOfferStatus();

    try {
        const totalOffers = await offerCollection.countDocuments(search);
        const totalPages = Math.ceil(totalOffers / limit);

        const offers = await offerCollection.aggregate([
            { $match: search },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category_id',
                    foreignField: '_id',
                    as: 'category_data'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product_data'
                }
            },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);

        res.render('./admin/offer', {
            offers,
            notification,
            convertDateString,
            page,
            totalPages,
            category,
            order,
            searchStr
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 'Message': "Internal Server Error" });
    }
};



// ------------------------------- Get next column data for form -------------------------- 

const getColumnData = async (req, res) => {
    const offer_type = req.body.offer_type || "";
    console.log("offer_type");
    console.log(offer_type);
    if (offer_type) {
        let data;
        try {
            if (offer_type === 'Product') {
                data = await productCollection.find({ product_status: 1 });
            } else if (offer_type === 'Category') {
                data = await categoryCollection.find({ category_status: 1 });
            } else {
                return res.status(400).json({ 'Message': "Invalid Offer Type" });
            }
            res.json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ 'Message': "Internal Server Error" });
        }
    } else {
        res.status(400).json({ 'Message': "Offer Type is empty" });
    }
};

// --------------------------------- Add New Offer ----------------------- 

const addOffer = async (req, res) => {
    const data = {
        offer_name: req.body.offer_name,
        offer_type: req.body.offer_type,
        offer_expiry: req.body.offer_expiry,
        offer_percentage: req.body.offer_percentage
    }
    let exist;
    if (data.offer_type === 'Product') {
        data['product_id'] = req.body.offer_id
        exist = await offerCollection.findOne({ product_id: data.product_id })
    }
    else if (data.offer_type === 'Category') {
        data['category_id'] = req.body.offer_id
        exist = await offerCollection.findOne({ category_id: data.category_id })
    }

    try {
        const existsName = await offerCollection.findOne({ offer_name: data.offer_name });
        if (existsName) {
            GlobalNotification = {
                status: 'error',
                message: 'Offer Name Already exists'
            }
        }
        else if (exist) {
            GlobalNotification = {
                status: 'error',
                message: 'Already an offer available for this Category / Product'
            }
        }
        else {
            const addOffer = await offerCollection.insertMany(data)
            if (addOffer) {
                GlobalNotification = {
                    status: 'success',
                    message: 'Offer Added Successfully'
                }
            }

        }


    } catch (err) {
        GlobalNotification = {
            status: 'error',
            message: 'Something went wrong'
        }
        console.log(err)
    }
    res.redirect('/admin/offer')
}


// ------------------------------------------- Delete offer ------------------------------ 

const removeOffer = async (req, res) => {
    const offerId = req.params.id
    try {
        const removeOffer = await offerCollection.findOneAndDelete({ _id: new ObjectId(offerId) })
        if (removeOffer) {
            GlobalNotification = {
                status: 'success',
                message: "Offer Deleted"
            }
        }
        else {
            GlobalNotification = {
                status: 'error',
                message: "Offer can not find"
            }
        }
    }
    catch (err) {
        GlobalNotification = {  
            status: 'error',
            message: "Offer is not Valid "
        }
    }

    res.redirect('/admin/offer')
}



async function checkOfferStatus() {
    const currentDate = new Date();
    const result = await offerCollection.deleteMany(
        { offer_expiry: { $lt: currentDate } }
    );
}
function convertDateString(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() is zero-based
    const day = String(date.getDate()).padStart(2, "0"); // Adding 2 days to the date
    return `${year}-${month}-${day}`;
}

module.exports = {
    getOffer,
    getColumnData,
    addOffer,
    removeOffer
}