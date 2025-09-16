
const orderCollection = require('../../Schema/orderModel')
const walletCollection = require('../../Schema/walletModel')
let globalNotification ={}
const { ObjectId } = require('mongodb');


// ------------------------------ Show All Orders ------------------- 

const showOrders = async (req, res) => {
  const category = req.query.category || '';
  const order = req.query.order || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  let query = {};
  let notification = {};

  if (globalNotification.status) {
    notification = globalNotification;
    globalNotification = {};
  }

  if (category && order) {
    query[category] = order === 'asc' ? 1 : -1;
  } else {
    query = { createdAt: -1 };
  }

  try {
    const totalCount = await orderCollection.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    const orderDetails = await orderCollection
      .find()
      .sort(query)
      .skip(skip)
      .limit(limit);

    const pendingCount = await orderCollection
      .find({ orderStatus: 'Pending' })
      .count();

    res.render('./admin/orderList', {
      orderDetails,
      notification,
      pendingCount,
      dateFormat,
      page,
      totalPages,
      category,
      order,
    });
  } catch (err) {
    console.log(err);
    res.redirect('/admin');
  }
};


// -------------------------------- Order accept, reject, cancel , deliver ---------------------- 

const updateOrderStatus= async (req,res)=>{
    const order_id = req.params.id
    const status = req.params.status
    if(status)
        {
            try
            {
                const updateStatus = await orderCollection.findOneAndUpdate({ _id : new ObjectId (order_id) },{ $set:{orderStatus:status} }) 
                if (['razorpay', 'Wallet'].includes(updateStatus.paymentMethod) && status =='Cancelled') {
                    const wallet_balance = updateStatus.totalPrice;
                    const transaction_details = {
                        wallet_amount: (updateStatus.totalPrice).toFixed(2),
                        order_id: updateStatus.order_id,
                        transactionType: 'Credited'
                    };
    
                    const checkWallet = await walletCollection.findOne({ customer_id: updateStatus.customer_id });
                    if (checkWallet) {
                        await walletCollection.findOneAndUpdate(
                            { _id: checkWallet._id },
                            { 
                                $inc: { wallet_balance: wallet_balance },
                                $push: { transaction: transaction_details }
                            }
                        );
                    } else {
                        await walletCollection.create({
                            customer_id: updateStatus.customer_id,
                            wallet_balance: wallet_balance,
                            transaction: [transaction_details]
                        });
                    }}
                
                if(updateStatus)
                    {
                        globalNotification={
                            status:'success',
                            message:"Order Status Updated"
                        }
                    }
            }
            catch(err)
            {
                console.log(err)
                globalNotification={
                    status:'error',
                    message:"Something went wrong. Try again"
                }
            }
            res.redirect('/admin/order')
        }
}

// ------------------------- Show Single order details --------------------------- 

const singleOrderdetails = async (req,res) =>{
    const order_id = req.params.id;
    try
    {
        const productData = await orderCollection.findOne({ _id : order_id})
        console.log(productData)
        res.render('./admin/singleOrderDetails',{ productData})
    }
    catch(error)
    {
        globalNotification={
            status: "error",
            message: "Something went Wrong"
        }

        res.redirect('/admin/order')
    }
}


// ------------------------------ formating timestamp to required format -------------------- 

function dateFormat(inputDate) {
    const formated = new Date(inputDate);
  
    const options = { year: "numeric", month: "short", day: "numeric" };
    const formattedDate = formated.toLocaleDateString("en-US", options);
    return formattedDate;
  }

module.exports ={
    showOrders,
    updateOrderStatus,
    singleOrderdetails
}

