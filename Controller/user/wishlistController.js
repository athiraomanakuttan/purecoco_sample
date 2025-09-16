const wishlistCollection = require('../../Schema/wishlistModel')
const productCollection = require('../../Schema/productModel');
const offerCollection = require('../../Schema/offerSchema');

const { ObjectId } = require('mongodb');
const cartCollection = require('../../Schema/cartModel');

// ----------------------- adding and remove  wishlist items ----------------- 
const addWishlist = async (req, res) => {
    const response = {};
  
    if (!req.session.user) {
      response.success = false;  
      response.redirect = '/login';
      return res.status(200).json(response);  // Ensure JSON response
    }
  
    const data = {
      customer_id: req.session.user,
      product_id: req.body.productId,
    };
  
    try {
      const checkWishList = await wishlistCollection.findOne(data);
      const checkCartList = await cartCollection.findOne(data)
      if(checkCartList == null){

      
      if (checkWishList == null) {
        
        await wishlistCollection.insertMany(data);
        response.success = true;
        response.action = 'added';
      } else {
        await wishlistCollection.findOneAndDelete({ _id: checkWishList._id });
        response.success = true;
        response.action = 'deleted';
      }
      res.status(200).json(response);  // Ensure JSON response
    }
    else
    {
        response.success = true;
        response.action = 'cartIn';
        res.status(200).json(response);
    }
      
    } catch (err) {
      console.log(err);
      res.status(400).json({ success: false, message: err.message });  // Ensure JSON response
    }
  };

  
//   ------------------------- showing wish list ---------------------------- 


const showWishlist = async (req, res) => {
    const userId = req.session.user;
    try {
        await checkWishlistStatus(userId);
        const wishlistData = await wishlistCollection.aggregate([
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

        if (wishlistData.length > 0) {
            await Promise.all(wishlistData.map(async (data) => {
                if (data.product_data.length > 0) {
                    data.product_data[0].offerData = await productOffer(data.product_id, data.product_data[0].category_id, data.product_data[0].product_price);
                }
            }));

            console.log(wishlistData[0].product_data);
        }

        res.render('./user/wishlist', { wishlistData });
    } catch (err) {
        console.log(err);
    }
};

// ---------------------------- Remove items from  wishlist -------------------- 

const removeWishlistItem = async (req,res)=>{
    const id = req.params.id
    const responces={}
    try{
        const removeItem = await wishlistCollection.findOneAndDelete({_id:id})
        responces={
            message:'success'
        }
        res.status('200').json(responces)
    } catch(err){ 
                console.log(err)
               res.status('400').json(responces)    }
}

// --------------------------------------- add item from  wishlist to cart ------------------- 

const wishlistToCart = async (req, res) => {
    const productId = req.params.id;
    const userId = req.session.user;
    let response = {};
    try {
        const findProduct = await productCollection.findOne({
            _id: new ObjectId(productId),
            product_status: 1
        });
        

        if (findProduct && findProduct.product_stock>0) {
            
            const data = {
                customer_id: userId,
                product_id: productId,
                quantity: 1
            };
            const checkCart = await cartCollection.findOne({ customer_id: userId, product_id: productId });

            if (!checkCart) {
                const addToCart = await cartCollection.insertMany(data);
                if (addToCart) {
                    await wishlistCollection.findOneAndDelete({ product_id: productId, customer_id: userId });
                    response = {
                        status: "success",
                        message: "Product added to cart"
                    };
                    res.json(response);
                } else {
                    response = {
                        status: "error",
                        message: "Not able to add product"
                    };
                    res.json(response);
                }
            } else {
                response = {
                    status: "error",
                    message: "Product already in cart"
                };
                res.json(response);
            }
        } else {
            response = {
                status: "error",
                message: "Out of stock"
            };
            res.json(response);
        }
    } catch (err) {
        console.log(err);
        response = {
            status: "error",
            message: "Internal Server Error"
        };
        res.status(500).json(response);
    }
};


async function checkWishlistStatus(userId)
{
    const  wishlistData = await wishlistCollection.find({customer_id:userId})
    if(wishlistData)
        {
            wishlistData.forEach(async (data) => {
                const productData = await productCollection.findOne({_id: data.product_id},{product_stock:1,product_status:1})
                if(productData && productData.product_stock>0 && productData.product_status==1 && data.wishlist_status!==1)
                    {
                        await wishlistCollection.findOneAndUpdate({_id:data._id},{$set:{wishlist_status : 1}})
                    }
                    else if(data.wishlist_status!==0)
                    {
                        await wishlistCollection.findOneAndUpdate({_id:data._id},{$set:{wishlist_status : 0 }})

                    }
            });
        }
}

async function productOffer(productId, categoryId, productPrice) {
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

module.exports ={
    addWishlist,
    showWishlist,
    removeWishlistItem,
    wishlistToCart
}