const { Router } = require("express");
const router =Router()
const passport = require('passport');
const userContoller=require('../Controller/user/userController')
const shopController = require('../Controller/user/shopController')
const profileController = require('../Controller/user/profileController')
const cartController = require('../Controller/user/cartController')
const orderController = require('../Controller/user/orderController')
const wishlistController = require('../Controller/user/wishlistController')
const coupenController = require('../Controller/user/coupenController')
const walletController= require('../Controller/user/walletController')
const {userSessionCheck,isUserLogedIn}= require('../Middleware/userMiddleware');
const cartCollection = require("../Schema/cartModel");
require('../Service/googleAuth') 

// ------------------------ Middldeware to check user loged in or not ------------------ 
router.use(isUserLogedIn)

// --------------------------- Basic routing ------------- 
router.get('/',userContoller.indexPage)


// -------------------------- Login and signup -------------- 
router.get('/signup',userContoller.showSignUp)
router.post('/signup',userContoller.addUser)
router.get('/resendOTP',userContoller.resendOTP)
router.post('/otp-verification',userContoller.verifyOTP)
router.get('/otp-expired',userContoller.otpExpired)
router.get('/login',userContoller.loginLoad)
router.post('/login',userContoller.userLogin)
router.get('/logout',userContoller.logout)
router.get('/reset-password',userContoller.resetPassword)
router.post('/verifyEmail',userContoller.verifyEmail)
router.post('/otp-verification-password',userContoller.passwordOtpVerify)
router.post('/updatePassword',userContoller.updatePassword)

// ------------------------- Google Authentification --------------- 
router.get('/auth/google',passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback',
passport.authenticate('google', { failureRedirect: '/signup' }),userContoller.googleLogin);

// -------------------------- Shop Section ----------------- 
router.get('/shop/',shopController.showShopPage)
router.post('/shop/',shopController.showWIthFilter)



// -------------------------- Profile Section ----------------- 
router.get('/profile',userSessionCheck, profileController.showProfile)
router.post('/update-profile',userSessionCheck,profileController.updateProfile)
router.post('/add-address',userSessionCheck,profileController.addAddress)
router.get('/edit-address/:index',userSessionCheck,profileController.editAddress)
router.post('/update-address/:index',userSessionCheck,profileController.updateAddress)
router.get('/remove-address/:index',userSessionCheck,profileController.removeAddress)


// -------------------------- Cart Section -------------------- 

router.post('/add-to-cart/:id',userSessionCheck,cartController.addToCart)
router.get('/view-cart',userSessionCheck,cartController.viewCart)
router.get('/remove-cart-item/:id',userSessionCheck,cartController.removeCartItem)
router.get('/checkout',userSessionCheck,cartController.checkoutPage)
router.post('/check-out',userSessionCheck,cartController.checkOut)
router.get('/view-product/:id',cartController.viewProduct)
router.post('/update-cart-item/:id',userSessionCheck,cartController.updateCartQantity)
router.get('/get-cartitem-count',userSessionCheck,cartController.getCartCount)

// --------------------------- order section ----------------------- 

router.get('/orders',userSessionCheck,orderController.viewOrders)
router.get('/view-order/:id',userSessionCheck,orderController.viewOrderDetails)
router.get('/cancel-order/:id',userSessionCheck,orderController.cancelOrder)
router.get('/cancel-order-item/:orderId/:productId',userSessionCheck,orderController.cancelOrderItem)
router.get('/success',userSessionCheck,cartController.successPage)
router.get('/verify-payment',userSessionCheck,cartController.paymentVerification)
router.post('/razorpay',userSessionCheck,cartController.razorpayPayment)
router.post('/razorpay-order',userSessionCheck,cartController.razorpayOrder)
router.post('/release-payment-lock',userSessionCheck,cartController.releasePaymentLock)
router.get('/check-payment-lock',userSessionCheck,cartController.checkPaymentLock)
router.get('/payment-success/:id/:orderId',userSessionCheck,cartController.updateOrderPayment)
router.post('/order-by-status',userSessionCheck,orderController.orderByStatus);
router.get('/cancel-pending-order/:id',userSessionCheck,orderController.cancelPendingOrder)
router.post('/repayment-razorpay',userSessionCheck,orderController.retryPaymentRazorpay)
router.post('/retry-payment-success',userSessionCheck,orderController.repaymentSuccess)
router.get('/return-order/:id',userSessionCheck,orderController.returnOrder)




// ---------------------------- wishlist section -------------------------------- 

router.post('/add-to-favorites', userSessionCheck, wishlistController.addWishlist)
router.get('/wish-list',userSessionCheck,wishlistController.showWishlist)
router.get('/wish-list-item-remove/:id',userSessionCheck,wishlistController.removeWishlistItem)
router.get('/wishlist-to-cart/:id',userSessionCheck,wishlistController.wishlistToCart)


// ------------------------------ coupen section ----------------- 

router.post('/get-coupens', userSessionCheck, coupenController.getCoupen)
router.post('/get-single-coupen',userSessionCheck,coupenController.getSingleCoupen)

// ----------------------------- wallet section --------------------- 

router.get('/wallet',userSessionCheck,walletController.getwallet)

// ------------------------------ Invoice section ------------------------------- 

router.get('/download-invoice/:id',userSessionCheck,orderController.downloadInvoice)







module.exports = router     