const { Router } = require("express");
const router = Router()
const adminController = require('../Controller/admin/adminController')
const categoryController = require('../Controller/admin/categoryController')
const productController = require('../Controller/admin/productCntroller')
const orderController = require('../Controller/admin/orderController')
const coupenController = require('../Controller/admin/coupenController')
const offerController = require('../Controller/admin/offerController')
const reportController = require('../Controller/admin/reportController')
const popularController = require('../Controller/admin/popularController')
const upload = require('../Middleware/multer');
const { adminSessionCheck, adminLoginCheck } = require('../Middleware/adminMiddleware')

// --------------------- Login  and Dashbored Section ------------------------------------ 

router.get('/', adminLoginCheck, adminController.loadAdminLogin)
router.post('/login', adminLoginCheck, adminController.adminLogin)
router.get('/dashboard', adminSessionCheck, adminController.loadDashBoard)
router.get('/logout', adminController.logout)

// ---------------------- User Managment Section ----------------------------------------------

router.get('/clients', adminSessionCheck, adminController.clientsListLoad)
router.get('/updateStatus/:id/:status', adminSessionCheck, adminController.updateClientStatus)

// ----------------------- Category Managment Section ---------------------------------------

router.get('/category', adminSessionCheck, categoryController.listCategory)
router.post('/addCategory', adminSessionCheck, categoryController.addCategory)
router.get('/removeCategory/:id', adminSessionCheck, categoryController.removeCategory)
router.get('/editCategory/:id', adminSessionCheck, categoryController.editCategory)
router.post('/editCategory/:id', adminSessionCheck, categoryController.updateCategory)

// ------------------------- Product Managment Section ----------- ----------------------------

router.get('/products', adminSessionCheck, productController.listProducts)
router.post('/add-product', adminSessionCheck, upload.array('product_images', 10), productController.addProduct)
router.get('/updateProductStatus/:id/:status', adminSessionCheck, productController.updateStatus)
router.get('/editproduct/:id', adminSessionCheck, productController.editProduct)
router.get('/product-image-delete/:id/:index', adminSessionCheck, productController.deleteProductImage);
router.post('/update-product/:id', adminSessionCheck, upload.array('product_images', 10), productController.updateProduct)



// -------------------------- Order Managment Section ------------------------------------------------------ 

router.get('/order', adminSessionCheck, orderController.showOrders)
router.get('/updateOrderStatus/:id/:status', adminSessionCheck, orderController.updateOrderStatus)
router.get('/orderDetails/:id', adminSessionCheck, orderController.singleOrderdetails)


// --------------------------------- Coupen managment -------------------------- 

router.get('/coupens',adminSessionCheck, coupenController.showCoupen) 
router.post('/add-coupen',adminSessionCheck, coupenController.addCoupen)
router.get('/removeCoupen/:id',adminSessionCheck, coupenController.removeCoupen)
router.get('/editCoupen/:id',adminSessionCheck,coupenController.editCoupen)
router.post('/update-coupen/:id',adminSessionCheck,coupenController.updateCoupen)


// -------------------- offer router --------------------------------- 

router.get('/offer',adminSessionCheck, offerController.getOffer)
router.post('/getOfferColumnData',adminSessionCheck,offerController.getColumnData)
router.post('/add-offer',adminSessionCheck,offerController.addOffer)
router.get('/removeOffer/:id',adminSessionCheck,offerController.removeOffer) 


// ----------------------- Report section ---------------------  

router.get('/report',adminSessionCheck,reportController.reportPage)
router.get('/getreport',adminSessionCheck,reportController.getPieChart)
router.get('/getsalesbymonth', adminSessionCheck, reportController.getSalesByMonth);
router.post('/fetch-sales-data', adminSessionCheck, reportController.getOrderDetails);
router.post('/downloadPDF',adminSessionCheck,reportController.downloadPDF)


// ------------------------ Popular section ------------------------------------- 

router.get('/popular',adminSessionCheck,popularController.popularPage)
router.get('/popularProducts',adminSessionCheck,popularController.popularProducts)
router.get('/popularCategory',adminSessionCheck,popularController.popularCategory)






module.exports = router