const productCollection = require('../../Schema/productModel')
const categoryCollection= require('../../Schema/categoryModel')
const offerCollection= require('../../Schema/offerSchema')
const wishlistCollection= require('../../Schema/wishlistModel')
require('express')

// ------------------------- SHOP page ----------------------------------- 

const showShopPage = async (req, res) => {
  const category = req.query.category || "";
  const sortby = req.query.sortby || "";
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1; // Current page number
  const limit = parseInt(req.query.limit) || 6; // Number of items per page

  try {
      const categoryData = await productCollection.aggregate([
          { $match: { product_status: 1 } },
          {
              $group: {
                  _id: "$category_id",
                  category_name: { $first: "$category_name" },
                  count: { $sum: 1 }
              }
          },
          {
              $project: {
                  _id: 0,
                  category_id: "$_id",
                  category_name: 1,
                  count: 1
              }
          }
      ]);

      let query = { product_status: 1 };
      let sort = {};

      if (category) {
          query.category_id = category;
      } else if (search) {
          query.$or = [
              { product_name: { $regex: search, $options: 'i' } },
              { category_name: { $regex: search, $options: 'i' } }
          ];
      }

      switch (sortby) {
          case '1':
              sort.product_price = 1;
              break;
          case '2':
              sort.product_price = -1;
              break;
          case '3':
              sort.timestamp = -1;
              break;
          case '4':
              sort.product_name = 1;
              break;
          case '5':
              sort.product_name = -1;
              break;
          default:
              sort.timestamp = -1;
      }

      const totalProducts = await productCollection.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);

      let productData = await productCollection.find(query)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit);

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

          if (bestOffer) {
              const discountedPrice = product.product_price - (product.product_price * (bestOffer.offer_percentage / 100));
              return {
                  ...product.toObject(),
                  discounted_price: discountedPrice,
                  offer_percentage: bestOffer.offer_percentage,
                  offer_type: offerType,
                  offer_name: bestOffer.offer_name
              };
          } else {
              return {
                  ...product.toObject(),
                  discounted_price: product.product_price,
                  offer_percentage: 0,
                  offer_type: '',
                  offer_name: ''
              };
          }
      }));

      if (req.session.user) {
          const customerId = req.session.user;

          productData = await Promise.all(productData.map(async (product) => {
              const wishlist = await wishlistCollection.find({ customer_id: customerId, product_id: product._id });
              product['isWishlist'] = wishlist.length > 0;
              return product;
          }));
      }

      res.render('./user/shop', {
          categoryData,
          productData,
          category,
          currentPage: page,
          totalPages,
          limit
      });
  } catch (err) {
      console.log(err);
      res.status(500).json({ 'Message': "Internal Server Error" });
  }
};




// ----------------------- Apply filter to shop page -------------------------- 

const showWIthFilter = async (req, res) => {
  const category = req.query.category || "";
  const data = {
    minAmount: req.body.minPrice,
    maxAmount: req.body.maxPrice
  };
  let currentPage =1;
  
  let query = {
    product_status: { $ne: -1 },
    // Combine price conditions using $and operator
    $and: [
      { product_price: { $gte: data.minAmount } },
      { product_price: { $lte: data.maxAmount } }
    ]
  };

  if (category) {
    query.category_id = category;
  }
  try {
   
    const categoryData = await productCollection.aggregate([
      {$match:{product_status:1}},
      {
        $group: {
          _id: "$category_id",
          category_name: { $first: "$category_name" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          category_id: "$_id",
          category_name: 1,
          count: 1
        }
      }
    ]);

    const productData = await productCollection.find(query).sort({ timestamp: -1 });
    
    res.render('./user/shop', { categoryData, productData, category ,currentPage,totalPages:1,limit:6});
  } catch (err) {
    console.log(err);
  }
};





module.exports ={
    showShopPage,
    showWIthFilter
}