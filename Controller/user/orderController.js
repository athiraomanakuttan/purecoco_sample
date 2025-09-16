const orderCollection = require('../../Schema/orderModel')

const productCollection = require('../../Schema/productModel')

const walletCollection = require('../../Schema/walletModel')

const PDFDocument = require('pdfkit');

const Razorpay = require('razorpay');

const { ObjectId } = require("mongodb");

let globalNotification ={}





// ----------------------- view full order list ---------------------  

const viewOrders= async (req,res)=>{

    let notification={}

    const user_id = req.session.user

    if(globalNotification.status)

        {

         notification= globalNotification;

         globalNotification={}

        }

    try{

        // const updateOrder = await updateOrderStatus(user_id)

        

        const totalOrder = await orderCollection.find({customer_id:user_id,orderStatus:{$in:['Confirmed', 'Pending', 'Delivered', 'Returned', 'Cancelled','Shipped','Payment Pending']}}).sort({createdAt:-1})

        // Get active orders (excluding cancelled and partially cancelled orders)
        const orderData = await orderCollection.find({
            customer_id: user_id,
            orderStatus: {$in:['Pending','Confirmed','Shipped']}
        }).sort({createdAt:-1})
        
        // Get cancelled orders (fully cancelled)
        const cancelledOrders = await orderCollection.find({
            customer_id: user_id,
            orderStatus: 'Cancelled'
        }).sort({createdAt:-1})
        
        // Get partially cancelled orders
        const partiallyCancelledOrders = await orderCollection.find({
            customer_id: user_id,
            orderStatus: 'Partially Cancelled'
        }).sort({createdAt:-1})
        
        // Get all orders with cancelled products (for individual product display)
        const ordersWithCancelledProducts = await orderCollection.find({
            customer_id: user_id,
            'products.product_status': 'Cancelled'
        }).sort({createdAt:-1})
        
        // Extract individual cancelled products with order info
        const cancelledProducts = []
        ordersWithCancelledProducts.forEach(order => {
            order.products.forEach(product => {
                if (product.product_status === 'Cancelled') {
                    cancelledProducts.push({
                        ...product,
                        order_id: order.order_id,
                        order_date: order.createdAt,
                        order_status: order.orderStatus,
                        payment_method: order.paymentMethod,
                        order_object_id: order._id,
                        product_category:product.product_category,
                        product_quantity:product.product_quantity,
                        product_price:product.product_price
                        
                    })
                }
            })
        })

        const pendingOrders = await orderCollection.find({customer_id:user_id,orderStatus:'Payment Pending'}).sort({createdAt:-1})

        

        res.render('./user/order',{orderData,notification,pendingOrders,totalOrder,cancelledOrders,partiallyCancelledOrders,cancelledProducts})

        

    }

    catch(err)

    {

        console.log(err); 

    }



}



// ------------------------------------- Get Order By Category ------------------- 



const orderByStatus= async(req,res)=>{

    const status = req.body.orderStatus;

    const user_id = req.session.user;

    if(status)

    {

        try{

        const orderData = await orderCollection.find({customer_id:user_id,orderStatus:status}).sort({createdAt:-1})

        res.json(orderData)



        }

        catch(err)

        {

            res.status(400).json({messsage: err})

        }

    }

    else

        res.status(400).json({messsage: 'order status is null'})



}



// ------------------------- individual order view ------------- 

const viewOrderDetails = async (req,res)=>{

    let notification={}

     const customer_id = req.session.user;

    const order_id = req.params.id;

    console.log(order_id)



    try

    {

        const productData = await orderCollection.findOne({ _id : order_id,customer_id:customer_id })
        
        if (!productData) {
            globalNotification = {
                status: "error",
                message: "Order not found"
            }
            return res.redirect('/orders')
        }
        
        // Calculate totals if they're missing from the database
        let calculatedTotalPrice = productData.totalPrice || 0
        let calculatedTotalQuantity = productData.totalQuantity || 0
        
        if (!productData.totalPrice || !productData.totalQuantity) {
            // Calculate from all products
            calculatedTotalPrice = productData.products.reduce((sum, product) => sum + (product.product_price * product.product_quantity), 0)
            calculatedTotalQuantity = productData.products.reduce((sum, product) => sum + product.product_quantity, 0)
        }
        
        // Filter products
        const activeProducts = productData.products ? productData.products.filter(product => product.product_status !== 'Cancelled') : []
        const cancelledProducts = productData.products ? productData.products.filter(product => product.product_status === 'Cancelled') : []
        
        // Create enhanced productData with calculated values
        const enhancedProductData = {
            ...productData,
            totalPrice: calculatedTotalPrice,
            totalQuantity: calculatedTotalQuantity,
            activeProducts,
            cancelledProducts
        }
        
        

        res.render('./user/singleOrderDetails',{ 
            productData: enhancedProductData, 
            activeProducts,
            cancelledProducts,
            notification 
        })

    }

    catch(error)

    {

        console.log(error)

        globalNotification={

            status: "error",

            message: "Something went Wrong"

        }

        res.redirect('/orders')

    }

}



// -------------------- Cancel Entire Order ----------------- 



const cancelOrder = async (req, res) => {

    const orderId = req.params.id;

    const customer_id = req.session.user;



    try {

        const orderData = await orderCollection.findOne({ _id: orderId, customer_id: customer_id });

        if (orderData) {

            for (const product of orderData.products) {

                try {

                    await productCollection.findOneAndUpdate(

                        { _id: product.product_id },

                        { $inc: { product_stock: product.product_quantity } }

                    );

                    await orderCollection.findOneAndUpdate(

                        { _id: orderId, 'products.product_id': product.product_id },

                        { $set: { 'products.$.product_status': 'Cancelled' } }

                    );

                } catch (err) {

                    console.log(err);

                    globalNotification = {

                        status: 'error',

                        message: 'Something went wrong'

                    };

                    res.redirect('/orders');

                    return;

                }

            }



            await orderCollection.findOneAndUpdate({ _id: orderId }, { $set: { orderStatus: 'Cancelled' } });



            if (['razorpay', 'Wallet'].includes(orderData.paymentMethod)) {

                const wallet_balance = orderData.totalPrice;

                const transaction_details = {

                    wallet_amount: (orderData.totalPrice).toFixed(2),

                    order_id: orderData.order_id,

                    transactionType: 'Credited'

                };



                const checkWallet = await walletCollection.findOne({ customer_id: customer_id });

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

                        customer_id: customer_id,

                        wallet_balance: wallet_balance,

                        transaction: [transaction_details]

                    });

                }

            }



            globalNotification = {

                status: 'success',

                message: 'Order Canceled Successfully'

            };

            res.redirect('/orders');

        }

    } catch (err) {

        console.log(err);

        globalNotification = {

            status: 'error',

            message: 'Something went wrong'

        };

        res.redirect('/orders');

    }

};



// ------------------------------ download invoice ------------------------- 



const downloadInvoice = async (req, res) => {

    const id = req.params.id;

    

    try {

        const order = await orderCollection.findOne({_id: new ObjectId(id)});

        if (!order) {

            return res.status(404).send('Order not found');

        }



        const doc = new PDFDocument();

        

        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order._id}.pdf`);

        res.setHeader('Content-Type', 'application/pdf');



        doc.pipe(res);



        // Header

        doc.fontSize(16)

           .text('Pure QOQO', 50, 50)

           .fontSize(10)

           .text('Your Company Address', 50, 70)

           .text('City, State ZIP', 50, 85)

        

        doc.fontSize(16)

           .text('Invoice', 250, 50, { align: 'center' });



        // Invoice details

        doc.fontSize(10)

           .text(`INVOICE NO #: ${order.order_id}`, 50, 120);



        // Billing Info

        doc.text('BILL TO:', 50, 180)

           .text(order.address.customer_name, 50, 195)

           .text(order.address.customer_emailid, 50, 210)

           .text(order.address.phonenumber, 50, 225)

           .text('SHIP TO:', 300, 180)

           .text(order.address.building +order.address.street , 300, 195)

           

           .text(order.address.city, 300, 210)

           .text(order.address.country + order.address.pincode, 300, 225)

           



           doc.moveTo(50, 260).lineTo(550, 260).stroke();

           doc.text('Product', 50, 270)

              .text('Category', 200, 270)

              .text('Qty', 300, 270)

              .text('Unit Price', 370, 270)

              .text('Amount', 470, 270);

           doc.moveTo(50, 285).lineTo(550, 285).stroke();

   

           // Table content

           let y = 300;

           order.products.forEach((item) => {

               doc.text(item.product_name, 50, y)

                  .text(item.product_category, 200, y)

                  .text(item.product_quantity.toString(), 300, y)

                  .text(`${item.product_price.toFixed(2)}`, 370, y)

                  .text(`${(item.product_quantity * item.product_price).toFixed(2)}`, 470, y);

               y += 20;

           });

           doc.moveTo(50, y).lineTo(550, y).stroke();

   



        // Totals

        const subtotal = order.products.reduce((sum, item) => sum + (item.product_quantity * item.product_price), 0);

        const discountMrp = 0; // Assuming no separate MRP discount field, set to 0 for now

        const couponDiscount = order.isCoupen && order.coupen_id ? subtotal - order.totalPrice : 0;



        y += 20;

        doc.text('Sub Total', 370, y)

           .text(`${subtotal.toFixed(2)}`, 470, y);

        y += 20;

        doc.text('Discount in MRP', 370, y).fillColor('red')

           .text(`-${discountMrp.toFixed(2)}`, 470, y);

        y += 20;

        doc.text('Coupon Discount', 370, y).fillColor('red')

           .text(`-${couponDiscount.toFixed(2)}`, 470, y);

        y += 20;

        doc.text('Shipping Charge', 370, y).fillColor("black")

           .text(subtotal<=1000 ? 25 : 0, 470, y);

        y += 20;

        doc.rect(370, y, 180, 25).fill('#800000');

        doc.fillColor('#FFFFFF')

           .text('Total', 380, y + 7)

           .text(`${order.totalPrice.toFixed(2)}`, 470, y + 7);



        // Payment Method

        doc.fillColor('#000000')

           .text(`Payment Method: ${order.paymentMethod}`, 50, y + 40);



        // Note

        doc.text('Note:', 50, y + 60)

           .text('Thank you for your business!', 50, y + 75);



        doc.end();



    } catch (error) {

        console.log(`Error from download invoice: ${error}`);

        res.status(500).send('Error generating invoice');

    }

};



const cancelPendingOrder = async (req,res)=>{

    const order_id = req.params.id;

    const user_id = req.session.user;

    try

    {

        if(order_id)

        {

            const deleteOrder = await orderCollection.findOneAndDelete({_id: new ObjectId(order_id),customer_id: user_id})

            if(deleteOrder)

            {

                globalNotification={

                    status:'success',

                    message:'Order Cancelled Successfully'

                }

            }else

            globalNotification={

                status:'error',

                message:'Something went wrong try again !'

            }



        }

        else

        {

            globalNotification={

                status:'error',

                message:'Order is not valid Try Again !'

            }

        }

    }catch(err)

    {

        console.log(err)

    }

    res.redirect('/orders')

}

// ------------------------------ Retry payment ------------------------------- 



const retryPaymentRazorpay = async (req, res) => {

    const order_id = req.body.orderId;

    const user_id = req.session.user;

    // Check server-side payment lock
    console.log('Repayment check - session:', req.session.paymentInProgress, 'time:', req.session.paymentLockTime);
    
    // Auto-release lock if it's older than 5 minutes
    if(req.session.paymentInProgress && req.session.paymentLockTime){
      const lockAge = Date.now() - req.session.paymentLockTime;
      if(lockAge > 5 * 60 * 1000) { // 5 minutes
        console.log('Auto-releasing stale repayment lock, age:', lockAge);
        req.session.paymentInProgress = false;
        req.session.paymentLockTime = null;
      }
    }
    
    if(req.session.paymentInProgress){
      console.log('Repayment already in progress, rejecting request');
      return res.status(409).json({ message: 'Payment is already in progress. Please wait.' });
    }
    
    // Set server-side payment lock
    req.session.paymentInProgress = true;
    req.session.paymentLockTime = Date.now();

    try {

      const orderData = await orderCollection.findOne({ _id: new ObjectId(order_id), customer_id: user_id });

      if (!orderData) {

        return res.status(404).json({ message: 'Order not found' });

      }

      

      const amountInPaise = Math.round(orderData.totalPrice * 100); // Round to nearest integer

  

      const instance = new Razorpay({

        key_id: 'rzp_test_1CXfduMW9euDd9',

        key_secret: 'dWBgdxhz2Xul2cGWrli9UDh0',

      }); 

  

      instance.orders.create({

        amount: amountInPaise, // Amount in paise

        currency: 'INR',

        receipt: `receipt#${order_id}`,

      }, (err, order) => {

        if (err) {

          // Log the complete error object for debugging

          console.error('Failed to create order:', err);

          // Send a detailed error message to the client

          return res.status(500).json({ message: `Failed to create order: ${err.message}` });

        }

  

        // If there is no error then send back the order id and total price

        return res.status(200).json({ orderID: order.id, totalPrice: orderData.totalPrice });

      });

    } catch (err) {

      // Log the error for debugging

      console.error('Error:', err);

      // Send a detailed error message to the client

      return res.status(500).json({ message: `Error: ${err.message}` });

    }

  };





// -------------------- Retry payment success ------------------------------------ 



const repaymentSuccess = async (req,res)=>{

    const orderId = req.body.orderId;

    const userId = req.session.user

    // Release server-side payment lock on success
    if(req.session.paymentInProgress){
      req.session.paymentInProgress = false;
      req.session.paymentLockTime = null;
    }

    console.log("orderId",orderId)

    console.log("userId",userId)

    try

    {

        const updateOrder = await orderCollection.findOneAndUpdate({_id: new ObjectId(orderId), customer_id:new ObjectId(userId) },{$set:{orderStatus: 'Pending'}});

        console.log(updateOrder);

        return res.status(200).json({message : 'success'})

    }catch(err)

    {

        console.log(err);

        return res.status(500).json({ message: `Error: ${err.message}` });

    }

}



const failed = (req,res)=>{

    res.render('./user/order-failed')

}





// --------------------------- Return order --------------------- 



 const returnOrder = async (req,res)=>{

    const orderId = req.params.id;

    const userId = req.session.user

    try{

        const orderDetails = await orderCollection.findOne({_id : new ObjectId(orderId),customer_id: new ObjectId(userId)})

        if(orderDetails){

            for (const product of orderDetails.products) {

                

                    await productCollection.findOneAndUpdate(

                        { _id: product.product_id },

                        { $inc: { product_stock: product.product_quantity } }

                    );

                }

            const updateOrder = await orderCollection.findOneAndUpdate({_id : new ObjectId(orderId),customer_id: new ObjectId(userId)},{$set:{orderStatus:'Returned'}})

            if(updateOrder)

            {

                if(orderDetails.paymentMethod === 'Wallet' || orderDetails.paymentMethod === 'razorpay' ){

                    const transaction_details = {

                        wallet_amount: orderDetails.totalPrice,

                        order_id: orderDetails.order_id,

                        transactionType: 'Credited'

                    };

                    const checkWallet = await walletCollection.findOne({ customer_id: userId });

                if (checkWallet) {

                    await walletCollection.findOneAndUpdate(

                        { customer_id: userId },

                        { 

                            $inc: { wallet_balance: transaction_details.wallet_amount },

                            $push: { transaction: transaction_details }

                        }

                    );

                }

                }

                globalNotification={

                    status:'success',

                    message:'order returning Initialized'

                }

            }

        }

        else

        {

            globalNotification={

                status:'error',

                message:'Unable to find the product Try again'

            }

        }

    }

    catch(err){

        console.log(err);

        globalNotification={

            status:'error',

            message:'Unable to return the Product Try again'

        }

    }

    res.redirect('/orders')

 }



// -------------------- Cancel Individual Product -----------------



const cancelOrderItem = async (req, res) => {

    const orderId = req.params.orderId;

    const productId = req.params.productId;

    const customerId = req.session.user;



    try {

        const order = await orderCollection.findOne({ _id: new ObjectId(orderId), customer_id: new ObjectId(customerId) });

        if (!order) {

            globalNotification = { status: 'error', message: 'Order not found' };

            return res.redirect('/orders');

        }



        const productItem = order.products.find(p => String(p.product_id) === String(productId));

        if (!productItem) {

            globalNotification = { status: 'error', message: 'Product not found in order' };

            return res.redirect(`/view-order/${orderId}`);

        }



        if (['Cancelled', 'Returned', 'Delivered'].includes(productItem.product_status)) {

            globalNotification = { status: 'error', message: `Item already ${productItem.product_status}` };

            return res.redirect(`/view-order/${orderId}`);

        }



        // Restock product quantity

        await productCollection.findOneAndUpdate(

            { _id: productItem.product_id },

            { $inc: { product_stock: productItem.product_quantity } }

        );



        // Calculate refund for this item

        const itemRefundAmount = Number(productItem.product_price) * Number(productItem.product_quantity);



        // Update the order: set item status, adjust totals

        const updatedTotalQuantity = Math.max(0, Number(order.totalQuantity || 0) - Number(productItem.product_quantity));

        const updatedTotalPrice = Math.max(0, Number(order.totalPrice || 0) - itemRefundAmount);



        // Set item to cancelled and adjust totals

        await orderCollection.findOneAndUpdate(

            { _id: new ObjectId(orderId), customer_id: new ObjectId(customerId), 'products.product_id': new ObjectId(productId) },

            { $set: { 'products.$.product_status': 'Cancelled', totalQuantity: updatedTotalQuantity, totalPrice: updatedTotalPrice } }

        );



        // If all items are cancelled, set overall order status to Cancelled

        const refreshed = await orderCollection.findOne({ _id: new ObjectId(orderId) });

        const allCancelled = refreshed.products.every(p => p.product_status === 'Cancelled');

        if (allCancelled) {

            await orderCollection.findOneAndUpdate({ _id: new ObjectId(orderId) }, { $set: { orderStatus: 'Cancelled' } });

        }



        // Wallet refund for prepaid methods

        if (['razorpay', 'Wallet'].includes(order.paymentMethod)) {

            const transaction_details = {

                wallet_amount: Number(itemRefundAmount.toFixed(2)),

                order_id: order.order_id,

                transactionType: 'Credited'

            };

            const existingWallet = await walletCollection.findOne({ customer_id: new ObjectId(customerId) });

            if (existingWallet) {

                await walletCollection.findOneAndUpdate(

                    { _id: existingWallet._id },

                    { $inc: { wallet_balance: transaction_details.wallet_amount }, $push: { transaction: transaction_details } }

                );

            } else {

                await walletCollection.create({

                    customer_id: new ObjectId(customerId),

                    wallet_balance: transaction_details.wallet_amount,

                    transaction: [transaction_details]

                });

            }

        }



        globalNotification = { status: 'success', message: 'Item cancelled and refunded to wallet' };

        return res.redirect(`/view-order/${orderId}`);

    } catch (err) {

        console.log(err);

        globalNotification = { status: 'error', message: 'Something went wrong' };

        return res.redirect(`/view-order/${orderId}`);

    }

}





// -------------------------------------- Other functions ------------------------- 



// ------------------- Recheck order STatus --------------- 



async function updateOrderStatus(customer_id)

{    

    const getOrderDetails = await orderCollection.find({ customer_id: customer_id })

    getOrderDetails.forEach(async (order)=>{

       const products = order.products;

       let status= true;

       const statusSet = new Set();

       for(let product of products)

        {

            if(statusSet.has(product))

                {

                    status = false;

                    break;

                }

                else

                {

                    statusSet.add(product)

                }

        }

        if(status && order.orderStatus!== order.products[0].product_status)

            {

                await orderCollection.findOneAndUpdate({ customer_id: customer_id,_id:order._id},{$set:{orderStatus:order.products[0].product_status}})

            }

    })



    

    

}

module.exports ={

viewOrders,

viewOrderDetails,

cancelOrder,

downloadInvoice,

orderByStatus,

cancelPendingOrder,

retryPaymentRazorpay,

repaymentSuccess,

returnOrder,

cancelOrderItem

}