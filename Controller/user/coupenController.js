const coupenCollection = require('../../Schema/coupenModel');
const orderModel = require('../../Schema/orderModel');

const getCoupen = async (req, res) => {
  const user_id = req.session.user
    await checkCoupenStatus();
    try {
      let { total_amount } = req.body;
      total_amount = Math.round(total_amount);
      // const coupenData = await coupenCollection.find({ coupen_amount_limit: { $lte: total_amount } });
      const coupenData = await coupenCollection.aggregate([
        // Step 1: Match coupons with the amount limit
        {
            $match: { 
                coupen_amount_limit: { $lte: total_amount } 
            }
        },
        // Step 2: Lookup orders for the specific user
        {
            $lookup: {
                from: 'orders',
                let: { coupenId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$coupen_id', '$$coupenId'] },
                                    { $eq: ['$customer_id', user_id] }
                                ]
                            }
                        }
                    }
                ],
                as: 'order_data'
            }
        },
        // Step 3: Filter coupons that don't have associated orders for the specific user
        {
            $match: {
                'order_data': { $eq: [] }
            }
        }
    ])

      console.log("coupenData",coupenData)
      res.json(coupenData);
    } catch(err) {
      console.log(err);
      res.status(400).json();
    }
  };
  
// --------------------- Get single coupen details --------------- 

const getSingleCoupen = async (req, res) => {
  const coupen_code = req.body.coupen_code || "";
  const user_id = req.session.user;
  if (coupen_code) {
      try {
          await checkCoupenStatus();
          const coupenData = await coupenCollection.findOne({ coupen_code: coupen_code });
          if (!coupenData) {
              return res.status(400).json({ message: "No coupon found with coupon code" });
          }
          const availabilityCheck = await orderModel.findOne({ customer_id: user_id, coupen_id: coupenData._id });
          if (coupenData && !availabilityCheck) {
              res.json(coupenData);
          } else if (availabilityCheck) {
              res.json({ message: "Coupon already used. Try a new one" });
          } else {
              res.status(400).json({ message: "No coupon found with coupon code" });
          }
      } catch (err) {
          res.status(400).json(err);
      }
  } else {
      res.status(400).json({ message: "Coupon code is required" });
  }
};


// ---------------------------- other functions ----------------------- 

async function checkCoupenStatus() {
    try {
        const currentDate = new Date();
        const result = await coupenCollection.deleteMany(
            { coupen_expiry: { $lt: currentDate } },
            { $set: { coupen_status: 0, updatedAt: currentDate } }
        );
        console.log(result);
    } catch (err) {
        console.log(err);
    }
}
module.exports ={
    getCoupen,
    getSingleCoupen
}
