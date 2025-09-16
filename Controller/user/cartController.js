const { ObjectId } = require("mongodb");
const cartCollection = require("../../Schema/cartModel");
const productCollection = require("../../Schema/productModel");
const clinetCollection = require("../../Schema/clientModel");
const { addressValidation } = require("../../public/user/validation");
const orderCollection = require("../../Schema/orderModel");
const walletCollection = require("../../Schema/walletModel");
const wishlistCollection = require("../../Schema/wishlistModel");
const Razorpay = require('razorpay');
const coupenCollection = require("../../Schema/coupenModel");
const offerCollection=require('../../Schema/offerSchema')
let globalNotification = {};
const razorpay = new Razorpay({
  key_id: 'rzp_test_1CXfduMW9euDd9',
  key_secret: 'dWBgdxhz2Xul2cGWrli9UDh0',
});


// ------------------------------ Add To Cart ------------------------- 

const addToCart = async (req, res) => {
  const data = {
    customer_id: req.session.user,
    product_id: req.params.id,
    quantity: req.body.quantity,
  };
  try {
    const stock = await productCollection.findOne(
      { _id: new ObjectId(data.product_id), product_status: 1 },
      { product_stock: 1 }
    );
    if (stock.product_stock < data.quantity || data.quantity <= 0) {
      globalNotification = {
        status: "error",
        message:
          data.quantity <= 0
            ? "Please add a valid quantity"
            : `Maximum quantity that can be added is ${stock.product_stock}`,
      };
      return res.redirect(`/view-product/${data.product_id}`);
    }

    const checkProduct = await productExist(data.product_id, data.customer_id);

    const checkWishList = await wishlistCollection.findOneAndDelete({product_id : data.product_id })
    if (checkProduct) {
      const newQuantity = data.quantity + checkProduct.quantity;

      await cartCollection.findOneAndUpdate(
        {
          _id: new ObjectId(checkProduct._id),
          product_id: new ObjectId(data.product_id),
        },
        { $set: { quantity: data.quantity } },
        { returnOriginal: false }
      );
    } else {
      data["cart_status"] = 1;
      await cartCollection.insertMany(data);
    }

    globalNotification = {
      status: "success",
      message: "Product Added to Cart",
    };
    res.redirect(`/view-product/${data.product_id}`);
  } catch (err) {
    console.log(err);
    res.redirect(`/view-product/${data.product_id}`);
  }
};

// ------------------------- View Single Product -----------------------

const viewProduct = async (req, res) => {
  const id = req.params.id || "";
  const userId = req.session.user || "";
  let notification = {};
  if (globalNotification.status) {
    notification = globalNotification;
    globalNotification = {};
  }
  if (id !== "") {
    try {
      // ------------------- Checking the user is active and product already exitst ------------------
      const cartData = await productExist(id, userId);
       
      let productData = await productCollection.findOne({
        _id: new ObjectId(id),
      })
      productData= [productData]
      productData = await productOffer(userId,productData)
      productData = productData[0]
      const allProducts = await productCollection.find({
        category_id: productData.category_id,
        product_status: 1,
        _id: { $ne: new ObjectId(productData._id) },
      });

      
      res.render("./user/singleProduct", {
        productData,
        allProducts,
        notification,
        cartData,
      });
    } catch (err) {
      console.log(err);
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
};

// ------------------------------- View Cart Items ---------------------------- 
const viewCart = async (req, res) => {
  const userId = req.session.user;
  let productData = [];
  let notification = {};
  if (globalNotification.status) {
    notification = globalNotification;
    globalNotification = {};
  }
  try {
    let cartItems = await cartCollection.find({
      customer_id: new ObjectId(userId),
    });

    if (cartItems) {
      await checkProductAvailability(cartItems);
      productData = await cartCollection.aggregate([
        { $match: { customer_id: new ObjectId(userId) } },
        {
          $lookup: {
            from: "products", // Name of the collection to join
            localField: "product_id", // Field from the input documents
            foreignField: "_id", // Field from the documents of the "from" collection
            as: "product_data", // Output array field
          },
        },
      ]);
      
      if (productData.length > 0) {
        await Promise.all(productData.map(async (data) => {
            if (data.product_data.length > 0) {
                data.product_data[0].offerData = await productOffer2(data.product_id, data.product_data[0].category_id, data.product_data[0].product_price);
            }
        }));
    }

    }

    res.render("./user/cart", { productData, notification });
  } catch (err) {
    console.log(err);
  }
};

//   --------------------- Remove cart item --------------

const removeCartItem = async (req, res) => {
  const cartId = req.params.id;
  try {
    const removeItem = await cartCollection.findOneAndDelete({
      _id: new ObjectId(cartId),
    });
    if (removeItem) {
      globalNotification = {
        status: "success",
        message: "Item Removed from Cart",
      };
    }
  } catch (err) {
    globalNotification = {
      status: "error",
      message: "Something went wrong",
    };
    console.log(err);
  }
  res.redirect("/view-cart");
};

// ----------------------- load CeckOut Page -----------------------
const checkoutPage = async (req, res) => {
  const user_id = req.session.user;
  let notification = {};
  if (globalNotification.status) {
    notification = globalNotification;
    globalNotification = {};
  }
  try {
    const userData = await clinetCollection.findOne(
      { _id: new ObjectId(user_id), customer_status: 1 },
      {
        customer_name: 1,
        customer_phone: 1,
        customer_emailid: 1,
        customer_address: 1,
      }
    );
    let productData = await cartCollection.find({
      customer_id: new ObjectId(user_id),
    });
    await checkProductAvailability(productData);
    productData = await cartCollection.aggregate([
      { $match: { customer_id: new ObjectId(user_id), cart_status: 1 } },
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product_data",
        },
      },
    ]);
    await Promise.all(productData.map(async (data) => {
      if (data.product_data.length > 0) {
          data.product_data[0].offerData = await productOffer2(data.product_id, data.product_data[0].category_id, data.product_data[0].product_price);
      }
  }));

    let amount_wallet;
    const walletamount = await walletCollection.findOne({customer_id:user_id},{wallet_balance:1,_id:0})
    if(!walletamount) amount_wallet=0
    else amount_wallet = walletamount.wallet_balance.toFixed(2)
    if (productData.length !== 0) {
      res.render("./user/checkOut", { userData, userId: user_id, productData, notification , walletamount: amount_wallet });
    } else {
      globalNotification = {
        status: "error",
        message: "Cart is empty add something to Cart",
      };
      res.redirect("/view-cart");
    }
  } catch (err) {
    console.log(err);
    globalNotification = {
      status: "error",
      message: "something went wrong.Try again",
    };
    res.redirect("/view-cart");
  }
};


// -------------------------- razorpay payment ------------------------

const razorpayPayment = async (req,res)=>{
  
  const userId = req.session.user;
  
  // Check server-side payment lock
  console.log('Razorpay payment check - session:', req.session.paymentInProgress, 'time:', req.session.paymentLockTime);
  
  // Auto-release lock if it's older than 5 minutes
  if(req.session.paymentInProgress && req.session.paymentLockTime){
    const lockAge = Date.now() - req.session.paymentLockTime;
    if(lockAge > 5 * 60 * 1000) { // 5 minutes
      console.log('Auto-releasing stale payment lock, age:', lockAge);
      req.session.paymentInProgress = false;
      req.session.paymentLockTime = null;
    }
  }
  
  if(req.session.paymentInProgress){
    console.log('Payment already in progress, rejecting request');
    return res.status(409).json({ message: 'Payment is already in progress. Please wait.' });
  }
  
  // Set server-side payment lock
  req.session.paymentInProgress = true;
  req.session.paymentLockTime = Date.now();
  console.log('Payment lock set for user:', userId);
  
  const  coupenCode = req.body.coupen_code
  
  const addressData = {
    customer_name: req.body.customer_name,
    customer_emailid: req.body.customer_emailid,
    building: req.body.building,
    street: req.body.street,
    city: req.body.city,
    country: req.body.country,
    pincode: Number(req.body.pincode),
    landmark: req.body.landmark,
    phonenumber: Number(req.body.phonenumber)
  };
  let addressValid = addressValidation(addressData);
  if (addressValid.status) {
    let cartData = await cartCollection.find({
      customer_id: new ObjectId(userId),
      cart_status: 1,
    });
    await checkProductAvailability(cartData);
    let productData = await cartCollection.aggregate([
      { $match: { customer_id: new ObjectId(userId), cart_status: 1 } },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product_data',
        },
      },
    ]);
    if (productData.length > 0) {
        await Promise.all(productData.map(async (data) => {
            if (data.product_data.length > 0) {
                data.product_data[0].offerData = await productOffer2(data.product_id, data.product_data[0].category_id, data.product_data[0].product_price);
            }
        }));
    }
    
    if (productData.length !== 0) {
      let totalSum = 0;
      let totalQuantity = 0;
      

      for (let product of productData) {
        let productDetail = product.product_data[0];

        

        let singleProduct = {
          product_quantity: product.quantity,
          product_price: productDetail.offerData.offer_amount ? productDetail.offerData.offer_amount : productDetail.product_price
        };

        totalSum += singleProduct.product_quantity * singleProduct.product_price;
        
      }

      const GST = Math.round((18 / 100) * totalSum * 100) / 100;
      const ShippingCharge = totalSum <= 1000 ? 25 : 0;
      
      let totalPrice = (totalSum + GST + ShippingCharge).toFixed(2);
      if(coupenCode && coupenCode !=="")
        {
          const coupenData = await coupenCollection.findOne({coupen_code:coupenCode});
          const availabilityCheck = await orderCollection.findOne({ customer_id: userId, coupen_id: coupenData._id });
          if(coupenData && !availabilityCheck)
            {
             if(coupenData.coupen_type == 'Flat OFF'  && totalPrice>=coupenData.coupen_amount_limit) 
              totalPrice= totalPrice- coupenData.coupen_offer_amount
            else if(coupenData.coupen_type =='Percentage' && totalPrice>=coupenData.coupen_amount_limit)
              totalPrice = totalPrice-(totalPrice*(coupenData.coupen_offer_amount/100))

            totalPrice = totalPrice.toFixed(2)
            }
        }
        
      if (totalPrice > 0) {
        
        const amountInPaise = Math.round(totalPrice * 100); // Round to nearest integer
        const instance = new Razorpay({
          key_id: 'rzp_test_1CXfduMW9euDd9',
          key_secret: 'dWBgdxhz2Xul2cGWrli9UDh0',
        });
        instance.orders.create({
            amount: amountInPaise, // Amount in paise
            currency: "INR",
            receipt: "receipt#1",
        }, (err, order) => {
            if (err) {
                // Log the complete error object for debugging
                console.error('Failed to create order:', err);
                // Send a detailed error message to the client
                return res.status(500).json({ message: `Failed to create order: ${err.message}` });
            }
            
            // If there is no error then send back the order id and total price
            return res.status(200).json({ orderID: order.id, totalPrice: totalPrice });
        });
    } else {
        res.status(400).json({ message: 'Cart is empty' });
    }

    } else {
      res.status(400).json({ message: 'Cart is empty'});
    }

  }
  else
  {
    console.log(addressValid.message)
    res.status(400).json({ message: addressValid.message });
  }
}

// ------------------------------- Razorpy order ----------------------- 
const razorpayOrder = async (req,res)=>{
  const userId = req.session.user;
  const addressData = {
    customer_name: req.body.customer_name,
    customer_emailid: req.body.customer_emailid,
    building: req.body.building,
    street: req.body.street,
    city: req.body.city,
    country: req.body.country,
    pincode: req.body.pincode,
    landmark: req.body.landmark,
    phonenumber: Number(req.body.phonenumber),
  };

  const order_id = Math.floor(100000 + Math.random() * 900000);
  const paymentMethod = req.body.pay_method;

    try {
      

      let productData = await cartCollection.aggregate([
        { $match: { customer_id: new ObjectId(userId), cart_status: 1 } },
        {
          $lookup: {
            from: 'products',
            localField: 'product_id',
            foreignField: '_id',
            as: 'product_data',
          },
        },
      ]);

      if (productData.length !== 0) {
        let totalSum = 0;
        let totalQuantity = 0;
        let orderData = {
          customer_id: userId,
          products: [],
        };

        for (let product of productData) {
          let productDetail = product.product_data[0];

          let productImage =
            productDetail.product_image &&
            productDetail.product_image.length > 0
              ? productDetail.product_image[0]
              : null;

          let singleProduct = {
            product_id: productDetail._id,
            product_name: productDetail.product_name,
            product_category: productDetail.category_name,
            product_quantity: product.quantity,
            product_price: productDetail.product_price,
            product_image: productImage,
          };

          totalSum += singleProduct.product_quantity * singleProduct.product_price;
          totalQuantity += singleProduct.product_quantity;
          orderData.products.push(singleProduct);

          await productCollection.updateOne(
            { _id: singleProduct.product_id },
            { $inc: { product_stock: -singleProduct.product_quantity } }
          );
        }

        const GST = Math.round((18 / 100) * totalSum * 100) / 100;
        const ShippingCharge = totalSum <= 1000 ? 25 : 0;
        
        orderData.totalPrice = (totalSum + GST + ShippingCharge).toFixed(2);
        orderData.totalQuantity = totalQuantity;
        orderData.address = addressData;
        orderData.paymentMethod = paymentMethod;
        if(paymentMethod === 'razorpay')
        orderData.orderStatus = 'Payment Pending';
        else
        orderData.orderStatus = 'Pending';
        orderData.order_id = order_id;

        try {
          const addOrder = await orderCollection.insertMany(orderData);
          if (addOrder) {
            for (let cartItem of productData) {
              await cartCollection.findOneAndDelete({ _id: cartItem._id });
            }
          }

          if (paymentMethod === 'razorpay') {
            const options = {
              amount: orderData.totalPrice * 100, // amount in paise
              currency: 'INR',
              receipt: String(order_id),
            };
            const razorpayOrder = await razorpay.orders.create(options);
            return res.render('./user/payment-page', { orderData, razorpayOrder });
          } else {
            
            res.render('./user/order-success');
          }
        } catch (err) {
          console.log(err);
          await productCollection.updateOne(
            { _id: singleProduct.product_id },
            { $inc: { product_stock: singleProduct.product_quantity } }
          );
          globalNotification = {
            status: 'error',
            message: 'Something went wrong. Please Try Again',
          };
        }
      } else {
        globalNotification = {
          status: 'error',
          message: 'Cart is empty add something to Cart',
        };
      }
    } catch (err) {
      globalNotification = {
        status: 'error',
        message: 'Something went wrong',
      };
      console.log(err);
    }
  
}
// ------------------------ Product Checkout ----------------------------- 

const checkOut = async (req, res) => {
  const razorPaymentStatus = req.body.paymentStatus
  console.log(razorPaymentStatus)
  const userId = req.session.user;
  
  // Release server-side payment lock on checkout completion
  console.log('Checkout completion - releasing lock. Was locked:', req.session.paymentInProgress);
  if(req.session.paymentInProgress){
    req.session.paymentInProgress = false;
    req.session.paymentLockTime = null;
    console.log('Payment lock released on checkout completion');
  }
  const addressData = {
    customer_name: req.body.customer_name,
    customer_emailid: req.body.customer_emailid,
    building: req.body.building,
    street: req.body.street,
    city: req.body.city,
    country: req.body.country,
    pincode: req.body.pincode,
    landmark: req.body.landmark,
    phonenumber: Number(req.body.phonenumber),
  };
  const coupenCode = req.body.coupenCode;

  const order_id = Math.floor(100000 + Math.random() * 900000);
  const paymentMethod = req.body.pay_method;

  if(paymentMethod ==='Cash on delivery' || paymentMethod ==='Wallet' ){
      let addressValid = addressValidation(addressData);
      if(!addressValid.status)
        {
            globalNotification = {
              status: 'error',
              message: addressValid.message,
            };
            return res.redirect('/checkout');
          
        }
        else
        {
          try {
            let cartData = await cartCollection.find({
              customer_id: new ObjectId(userId),
              cart_status: 1,
            });
            await checkProductAvailability(cartData);
        }
        catch (err) {
      globalNotification = {
        status: 'error',
        message: 'Something went wrong',
      };
      console.log(err);
    }
    }

  }
   

      let productData = await cartCollection.aggregate([
        { $match: { customer_id: new ObjectId(userId), cart_status: 1 } },
        {
          $lookup: {
            from: 'products',
            localField: 'product_id',
            foreignField: '_id',
            as: 'product_data',
          },
        },
      ]);
      if (productData.length > 0) {
        await Promise.all(productData.map(async (data) => {
            if (data.product_data.length > 0) {
                data.product_data[0].offerData = await productOffer2(data.product_id, data.product_data[0].category_id, data.product_data[0].product_price);
            }
        }));
    }

      if (productData.length !== 0) {
        let totalSum = 0;
        let totalQuantity = 0;
        let orderData = {
          customer_id: userId,
          products: [],
        };

        for (let product of productData) {
          let productDetail = product.product_data[0];

          let productImage =
            productDetail.product_image &&
            productDetail.product_image.length > 0
              ? productDetail.product_image[0]
              : null;

          let singleProduct = {
            product_id: productDetail._id,
            product_name: productDetail.product_name,
            product_category: productDetail.category_name,
            product_quantity: product.quantity,
            product_price: productDetail.offerData.offer_amount ? productDetail.offerData.offer_amount : productDetail.product_price,
            product_image: productImage,
          };

          totalSum += singleProduct.product_quantity * singleProduct.product_price;
          totalQuantity += singleProduct.product_quantity;
          orderData.products.push(singleProduct);

          await productCollection.updateOne(
            { _id: singleProduct.product_id },
            { $inc: { product_stock: -singleProduct.product_quantity } }
          );
        }
        

        const GST = Math.round((18 / 100) * totalSum * 100) / 100;
        const ShippingCharge = totalSum <= 1000 ? 25 : 0;
        let totalPrice = (totalSum + GST + ShippingCharge).toFixed(2);
        if(coupenCode)
          {
            const coupenData = await coupenCollection.findOne({coupen_code: coupenCode})
            const availabilityCheck = await orderCollection.findOne({ customer_id: userId, coupen_id: coupenData._id });
            if(coupenData && !availabilityCheck)
              {
                if(coupenData.coupen_type === 'Flat OFF' &&  totalPrice>=coupenData.coupen_amount_limit)
                  {
                    totalPrice = totalPrice - coupenData.coupen_offer_amount
                  }else if(coupenData.coupen_type === 'Percentage' &&  totalPrice>=coupenData.coupen_amount_limit)
                  {
                    totalPrice = totalPrice -(totalPrice * ((coupenData.coupen_offer_amount) /100)) 
                  }
                  totalPrice= totalPrice.toFixed(2)
                orderData.isCoupen = true;
                orderData.coupen_id = coupenData._id;
              }
              
          }
        orderData.totalPrice = totalPrice;
        orderData.totalQuantity = totalQuantity;
        orderData.address = addressData;
        orderData.paymentMethod = paymentMethod;
        if(paymentMethod ==='razorpay' && razorPaymentStatus === 'failed')
        orderData.orderStatus = 'Payment Pending';
        else
        orderData.orderStatus = 'Pending';
        orderData.order_id = order_id;
        if(paymentMethod === 'Wallet'){
          const walletData = await walletCollection.findOne({customer_id: userId})
          if(walletData && walletData.wallet_balance>=orderData.totalPrice)
            {
              let transaction =
              {
                wallet_amount: totalPrice,
                order_id:order_id,
                transactionType:'Debited'
              }
              const updateWallet = await walletCollection.findOneAndUpdate(
                { _id: walletData._id, customer_id: userId },
                {
                  $inc: { wallet_balance: -totalPrice },
                  $push: { transaction: transaction }
                },
                { returnDocument: 'after' } // Use 'after' to return the updated document
              );
            }
            else{
              globalNotification = {
                status: 'error',
                message: "wallet balance is low. Try another method",
              };
              
              return res.redirect('/checkout');
            }
        }
        try {
          const addOrder = await orderCollection.insertMany(orderData);
          if (addOrder) {
            for (let cartItem of productData) {
              await cartCollection.findOneAndDelete({ _id: cartItem._id });
            }
          }
          if(razorPaymentStatus === 'failed')
            {
              res.render('./user/order-failed');
            }
            else
            res.render('./user/order-success');
          
        } catch (err) {
          console.log(err);
          await productCollection.updateOne(
            { _id: singleProduct.product_id },
            { $inc: { product_stock: singleProduct.product_quantity } }
          );
          globalNotification = {
            status: 'error',
            message: 'Something went wrong. Please Try Again',
          };
        }
      } else {
        globalNotification = {
          status: 'error',
          message: 'Cart is empty add something to Cart',
        };
      }
    
  
};

// -------------------------------- Update the quantity of cart products -------------------------

const updateCartQantity = async (req,res)=>{
    const cartId = req.params.id;
    const quantity = req.body.quantity;
    const userId = req.session.user
    let response={}
    if(cartId && quantity){
      try
      {
        
        productData = await cartCollection.aggregate([
          { $match: { customer_id: new ObjectId(userId), _id : new ObjectId(cartId) } },
          {
            $lookup: {
              from: "products", // Name of the collection to join
              localField: "product_id", // Field from the input documents
              foreignField: "_id", // Field from the documents of the "from" collection
              as: "product_data", // Output array field
            },
          },
        ]);

        
      }
      catch(err){
        console.log(err)
      }
      
      if(productData.length )
        {
          let product =productData[0].product_data
          if(quantity >0 && quantity<=product[0].product_stock)
            {
              await cartCollection.findOneAndUpdate({
                _id: new ObjectId(cartId), customer_id: new ObjectId(userId)
              },{
                $set:{
                  quantity: quantity
                }
              })

              response ={
                status : 'Suceess',
                message:"Quantity updated"
              }
            }
        }
        else{
      response ={
        status : 'error',
        message:"Not valid details"
      }}

      
    }
    else
    {
      response ={
        status : 'error',
        message:"Not valid details"
      }
    }
    res.json(response);
}


// --------------------------- Order Success page ----------------------------- 

const successPage= (req,res)=>{
    res.render('./user/order-success')
}

// ----------------------------------- Update order successfull ----------------------------- 
const updateOrderPayment = async (req,res) => {
  const paymentId = req.params.id;
  const orderId = Number(req.params.orderId);
  const userId = req.session.user
  try
  {
    const updateOrder = await orderCollection.findOneAndUpdate({customer_id : userId,order_id : orderId },{$set:{
      orderStatus:'Pending', paymentId:paymentId}})

  }
  catch( err){
    console.log(err)
  }
  res.render('./user/order-success')
}

// ------------------------------- Payment verification ----------------------- 
const paymentVerification = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const hmac = crypto.createHmac('sha256', 'dWBgdxhz2Xul2cGWrli9UDh0');
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');
  
  if (generatedSignature === razorpay_signature) {
    res.send('Payment verified');
  } else {
    res.status(400).send('Invalid signature');
  }
}

// ------------------------------- count of items in cart -------------------------- 

const getCartCount = async (req, res) => {
  try {
      const user_id = req.session.user;
      if (!user_id) {
          return res.status(400).json({ error: 'User not logged in' });
      }

      // Fetch cart data
      let cartData = await cartCollection.find({
          customer_id: new ObjectId(user_id),
          cart_status: 1,
      })

      // Check product availability
      await checkProductAvailability(cartData);

      // Count items in the cart
      const itemCount = await cartCollection.find({
          customer_id: new ObjectId(user_id)
      }).count();

      res.status(200).json(itemCount);
  } catch (error) {
      console.error('Error fetching cart count:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ------------------------------- Release Payment Lock ----------------------- 
const releasePaymentLock = async (req, res) => {
  try {
    console.log('Release lock request - was locked:', req.session.paymentInProgress);
    if(req.session.paymentInProgress){
      req.session.paymentInProgress = false;
      req.session.paymentLockTime = null;
      console.log('Payment lock manually released');
      return res.status(200).json({ message: 'Payment lock released' });
    }
    return res.status(200).json({ message: 'No active payment lock' });
  } catch (error) {
    console.error('Error releasing payment lock:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ------------------------------- Check Payment Lock Status ----------------------- 
const checkPaymentLock = async (req, res) => {
  try {
    const lockStatus = {
      isLocked: !!req.session.paymentInProgress,
      lockTime: req.session.paymentLockTime,
      lockAge: req.session.paymentLockTime ? Date.now() - req.session.paymentLockTime : 0
    };
    console.log('Lock status check:', lockStatus);
    return res.status(200).json(lockStatus);
  } catch (error) {
    console.error('Error checking payment lock:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



// ------------------------------------ Product avaible or not checking --------------------------- 

async function checkProductAvailability(cartItems) {
  const updatedCartItems = [];

  for (const element of cartItems) {
    let response = { status: true };

    try {
      const product = await productCollection.findOne({
        _id: new ObjectId(element.product_id),
        product_status: 1,
      });

      if (!product) {
        await cartCollection.findOneAndUpdate(
          { _id: new ObjectId(element._id) },
          { $set: { cart_status: 0 } }
        );
        response = {
          status: false,
          message: "Product Not Available",
        };
      } else if (product.product_stock <= 0) {
        await cartCollection.findOneAndUpdate(
          { _id: new ObjectId(element._id) },
          { $set: { cart_status: 0 } }
        );
        response = {
          status: false,
          message: "Out Of Stock",
        };
      } else if (product.product_stock < element.quantity) {
        await cartCollection.findOneAndUpdate(
          { _id: new ObjectId(element._id) },
          { $set: { cart_status: 0 } }
        );
        response = {
          status: false,
          message: `Product stock is limited. You can purchase a maximum of ${product.product_stock} quantity`,
        };
      } else if (element.cart_status === 0) {
        await cartCollection.findOneAndUpdate(
          { _id: new ObjectId(element._id) },
          { $set: { cart_status: 1 } }
        );
      }
    } catch (err) {
      console.error(err);
      response = {
        status: false,
        message: "Error checking product availability",
      };
    }

    const plainElement = element.toObject ? element.toObject() : element; // Convert to plain object if it's a Mongoose document
    plainElement.availability = response.status;

    if (!response.status) {
      plainElement.message = response.message;
    }

    updatedCartItems.push(plainElement);
  }

  return updatedCartItems;
}

// ---------------------------------------- Check the Product Exist or not -------------------------- 

async function productExist(productId, userId) {
  let responce;

  if (!productId || !userId) {
    responce = false;
  } else {
    try {
      const checkProduct = await cartCollection.findOne({
        customer_id: new ObjectId(userId),
        product_id: new ObjectId(productId),
      });

      if (checkProduct !== null) {
        responce = checkProduct;
      } else {
        responce = false;
      }
    } catch (err) {
      console.log(err);
    }
  }

  return responce;
}


async function productOffer(userId="",productData)
{
  productData = await Promise.all(productData.map(async (product) => {
    const productOffers = await offerCollection.find({ product_id: product._id }).sort({ offer_percentage: -1 }).limit(1);
    const categoryOffers = await offerCollection.find({ category_id: product.category_id }).sort({ offer_percentage: -1 }).limit(1);

    let bestOffer = null;
    let offerType = '';

    if (productOffers.length > 0 && (!categoryOffers.length || productOffers[0].offer_percentage > categoryOffers[0].offer_percentage)) {
        bestOffer = productOffers[0];
        offerType = 'Product';
    } else if (categoryOffers.length > 0) {
        bestOffer = categoryOffers[0];
        offerType = 'Category';
    }

    // Calculate discounted price if there is an offer
    if (bestOffer) {
        const discountedPrice = product.product_price - (product.product_price * (bestOffer.offer_percentage / 100));
        return {
            ...product.toObject(), // Convert Mongoose document to plain JavaScript object
            discounted_price: discountedPrice,
            offer_percentage: bestOffer.offer_percentage,
            offer_type: offerType,
            offer_name: bestOffer.offer_name
        };
    } else {
        return {
            ...product.toObject(),
            discounted_price: product.product_price, // No discount
            offer_percentage: 0,
            offer_type: '',
            offer_name: ''
        };
    }
}));

// Check if user is logged in and fetch wishlist
if (userId) {
    const customerId = userId;


    productData = await Promise.all(productData.map(async (product) => {
      const wishlist = await wishlistCollection.find({ customer_id: customerId, product_id: product._id });
      if (wishlist.length>0) {
        product['isWishlist'] = true;
      } else {
        product['isWishlist'] = false;
      }
      return product;
    }));
  }
  return productData;
}

async function productOffer2(productId, categoryId, productPrice) {
  let offerDetails = {};
  try {
      const productOfferCheck = await offerCollection.findOne({ product_id: productId });
      const categoryOfferCheck = await offerCollection.findOne({ category_id: categoryId });
      
      if (productOfferCheck) {
          offerDetails = {
              offer_percentage: productOfferCheck.offer_percentage,
              offer_value: productPrice * (productOfferCheck.offer_percentage / 100),
          };
      } else if (categoryOfferCheck) {
          offerDetails = {
              offer_percentage: categoryOfferCheck.offer_percentage,
              offer_amount: productPrice - (productPrice * (categoryOfferCheck.offer_percentage / 100)),
          };
      }
  } catch (err) {
      console.log(err);
  }
  return offerDetails;
}



module.exports = {
  addToCart,
  viewProduct,
  viewCart,
  removeCartItem,
  checkoutPage,
  checkOut,
  successPage,
  paymentVerification,
  razorpayPayment,
  updateOrderPayment,
  razorpayOrder,
  updateCartQantity,
  getCartCount,
  releasePaymentLock,
  checkPaymentLock
};
