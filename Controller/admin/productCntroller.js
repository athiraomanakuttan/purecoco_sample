const validation = require("../../public/admin/validations");
const Config = require('../../Config/dbConnect')
const productCollection = require('../../Schema/productModel')
const categoryCollection = require('../../Schema/categoryModel')
const multer = require('../../Middleware/multer')
const path = require('path');
const { productValidation }= require('../../public/admin/validations')
const { ObjectId } = require("mongodb");
let globalNotification={}


// ---------------------- List all products -------------------------------- 

const listProducts = async (req, res) => {
  console.log('📩 Flash status:', req.flash('status'));
  console.log('📩 Flash message:', req.flash('message'));
  console.log('📩 res.locals.notification:', res.locals.notification);

  const search = req.query.search || "";
  const category = req.query.category || "";
  const order = req.query.order || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  const skip = (page - 1) * limit;
  let sortQuery = {};

  if (category && order) {
    sortQuery[category] = order === "asc" ? 1 : -1;
  } else {
    sortQuery["timestamp"] = -1;
  }

  try {
    let productQuery = { product_status: { $ne: -1 } };

    if (search !== '') {
      productQuery = {
        $and: [
          { product_status: { $ne: -1 } },
          {
            $or: [
              { product_name: { $regex: search, $options: 'i' } },
              { category_name: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    const totalProducts = await productCollection.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    const productData = await productCollection
      .find(productQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const categoryData = await getCategory();
    const productCount = await getProductCount();

    // DON'T pass notification - it's already in res.locals from middleware
    res.render('./admin/productList', {
      productData,
      categoryData,
      // notification,  ← REMOVE THIS LINE
      dateFormat,
      productCount,
      page,
      totalPages,
      search,
      order,
      category
    });
  } catch (err) {
    console.log("Error fetching product details: " + err);
  }
};




// ----------------------------------- Add a new product -------------------- 

const addProduct = async (req, res) => {
  const data = {
    product_name: req.body.product_name,
    product_description: req.body.product_description,
    product_price: req.body.product_price,
    product_quantity: req.body.product_quantity,
    product_stock: req.body.product_stock,
    category_id: req.body.product_category,
    product_status: 1,
    timestamp: Date.now()
  };

  const validation = productValidation(data);
  
  if (!validation.error) {
    const exist = await productCollection.findOne({ 
      product_name: data.product_name, 
      product_status: { $ne: -1 } 
    });

    if (exist === null) {
      const category = await categoryCollection.findOne(
        { _id: data.category_id }, 
        { category_name: 1 }
      );
      data['category_name'] = category.category_name;
      
      const images = req.files;
      if (!images || images.length === 0) {
        console.log('❌ Setting flash: No files uploaded'); // DEBUG
        req.flash('status', 'error');
        req.flash('message', 'No files were uploaded.');
        return res.redirect('/admin/products');
      }

      let imageUrls = [];
      images.forEach(file => imageUrls.push(path.basename(file.path)));
      data['product_image'] = imageUrls;

      try {
        const insertProduct = await productCollection.insertMany(data);
        if (insertProduct !== null) {
          console.log('✅ Setting flash: Product added successfully'); // DEBUG
          req.flash('status', 'success');
          req.flash('message', 'Product added successfully');
        }
        return res.redirect('/admin/products');
      } catch (err) {
        console.error('Error inserting product:', err);
        req.flash('status', 'error');
        req.flash('message', 'Error adding product');
        return res.redirect('/admin/products');
      }
    } else {
      console.log('❌ Setting flash: Product already exists'); // DEBUG
      req.flash('status', 'error');
      req.flash('message', 'Product Name already exists');
      return res.redirect('/admin/products');
    }
  } else {
    console.log('❌ Setting flash: Validation error -', validation.message); // DEBUG
    req.flash('status', 'error');
    req.flash('message', validation.message);
    return res.redirect('/admin/products');
  }
};
  

//   ------------------------- Product disable, ebable , delete ------------------------ 

const updateStatus = async (req, res) => {
    const id = req.params.id;
    const status = parseInt(req.params.status);
    
    if (status >= -1 && status <= 1) {
        try {
            const changeStatus = await productCollection.findOneAndUpdate(
                { _id: new ObjectId(id) }, 
                { $set: { product_status: status } }
            );
            
            if (changeStatus !== null) {
                let message = '';
                if (status == 0) {
                    message = "Product Disabled successfully";
                } else if (status == 1) {
                    message = "Product Enabled successfully";
                } else if (status == -1) {
                    message = "Product Deleted successfully";
                }
                
                req.flash('status', 'success');
                req.flash('message', message);
                
                // Return JSON for fetch requests
                return res.json({ 
                    success: true, 
                    message: message 
                });
            }
        } catch (err) {
            console.error(err);
            req.flash('status', 'error');
            req.flash('message', "Update failed");
            
            return res.status(500).json({ 
                success: false, 
                message: "Update failed" 
            });
        }
    } else {
        req.flash('status', 'error');
        req.flash('message', 'Invalid operation');
        
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid operation' 
        });
    }
};
// -------------------------------- Product Editing ----------- 

const editProduct = async (req, res) => {
    const notification = {}
    const id = req.params.id || ""
    if (id !== "") {
        try {
            const productData = await productCollection.findOne({ _id: new ObjectId(id) })
            if (productData !== null) {
                const categoryData = await getCategory();
                const productCount= await getProductCount()
                res.render('./admin/productEdit', { productData, notification, categoryData , productCount})
            }
            else {
                notification['status'] = 'error'
                notification['message'] = 'No Product Found'
            }
        }
        catch (err) {
            notification['status'] = 'error'
            notification['message'] = 'Something went wrong'
            console.log(err)
        }
    }
    else {
        notification['status'] = 'error'
        notification['message'] = 'Something went wrong'
    }

}

// ----------------------- Delete product image one by one ----------------------

const deleteProductImage = async (req, res) => {
    const id = req.params.id;
    const index = req.params.index;
    try {
        await productCollection.updateOne(
            { _id: new ObjectId(id) },
            { $unset: { [`product_image.${index}`]: 1 } }
        );
        await productCollection.updateOne(
            { _id: new ObjectId(id) },
            { $pull: { product_image: null } }
        );
    } catch (err) {
        console.log(err);
    }
    res.json({ 
            success: true, 
            message: 'Image deleted successfully' 
  });
};


//   --------------------------- Update product --------------

const updateProduct = async (req, res) => {
    const id = req.params.id
    const data = {
        product_name: req.body.product_name,
        product_description: req.body.product_description,
        product_price: req.body.product_price,
        product_quantity: req.body.product_quantity,
        product_stock: req.body.product_stock,
        category_id: req.body.product_category,
        product_status: 1,
        timestamp: Date.now()
    }
    let notification={}
    const validation = productValidation(data)
    if(!validation.error){
    const productData = await productCollection.findOne({ _id: new ObjectId(id) })
    const images = req.files;

    if (productData.product_image.length + images.length > 4) {
        notification['status'] = 'error';
        notification['message'] = 'Maximum number of files allowed is 4';
        const categoryData = await getCategory();
        const productCount= await getProductCount()
        res.render('./admin/productEdit', { productData, notification, categoryData , productCount})
    }
    else {
        const category = await categoryCollection.findOne({ _id: data.category_id }, { category_name: 1 })
        data['category_name'] = category.category_name;
        let imageUrls = []
        images.map(file => imageUrls.push(path.basename(file.path)));
        const updateProduct = await productCollection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: data,
                $push: { product_image: { $each: imageUrls } }
            }
        );
        notification['status'] = 'success'
        notification['message'] = 'Product Updated Successfully'

        const productData = await productCollection.find({ product_status: { $ne: -1 } }).sort({ timestamp: -1 });;
        const categoryData = await getCategory();
        const productCount= await getProductCount()
        const totalProducts = await productCollection.countDocuments();
        const totalPages = Math.ceil(totalProducts / 10);
        return res.redirect('/admin/products');
        // res.render('./admin/productList', { productData, categoryData, notification, dateFormat , productCount, page:1, totalPages})

    }
    }
    else
    {
        notification['status'] = 'error'
        notification['message'] = validation.message
        const productData = await productCollection.find({ product_status: { $ne: -1 } }).sort({ timestamp: -1 });;
        const categoryData = await getCategory();
        const productCount= await getProductCount()
        res.render('./admin/productList', { productData, categoryData, notification, dateFormat ,productCount,page:1})
    }
}


const multerMiddle = multer.array("productImage", 4)

// ------------------------------------------ Get all categorys -------------- 
async function getCategory() {
    return await categoryCollection.find({ category_status: 1 }).sort({ timestamp: -1 })
}

// ----------------------------------------- Get Product count -------------------- 
async function getProductCount()
{
    return await productCollection.find({product_status:{$ne:-1}}).count()
}

// ----------------------- Date format -----------------------------------------

function dateFormat(inputDate) {
    const formated = new Date(inputDate);
    const options = { year: "numeric", month: "short", day: "numeric" };
    const formattedDate = formated.toLocaleDateString("en-US", options);
    return formattedDate;
}



module.exports = {
    listProducts,
    addProduct,
    multerMiddle,
    updateStatus,
    editProduct,
    deleteProductImage,
    updateProduct
}
