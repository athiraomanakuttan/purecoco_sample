const orderController = require('../../Schema/orderModel')
//------------------------- Load the popular page ------------------------------------------
const popularPage = async (req,res)=>{
    res.render('./admin/popular')
}
// --------------- get popular products --------------------------- 

const popularProducts = async (req, res) => {
    try {
        const productData = await orderController.aggregate([
            { $unwind: '$products' },
            { 
                $group: { 
                    _id: '$products.product_id', 
                    totalQuantitySold: { $sum: '$products.product_quantity' },
                    productName: { $first: '$products.product_name' },
                    productCategory: { $first: '$products.product_category' },
                    productImage: { $first: '$products.product_image' } 
                } 
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 }
        ]);

       
        res.json(productData)
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};

const popularCategory = async (req,res)=>{
try
{
    const categoryData = await orderController.aggregate([
        { $unwind: '$products' },
        { 
            $group: { 
                _id: '$products.product_category', 
                totalQuantitySold: { $sum: '$products.product_quantity' }, // Sum the quantity of products sold in each category
                category_name: { $first: '$products.product_category' }
            } 
        },
        { $sort: { totalQuantitySold: -1 } }, // Sort by total quantity sold in descending order
        { $limit: 10 } // Limit to top 10 categories
    ]);
    console.log(categoryData)
    res.json(categoryData)
}catch(err){
    res.status(500).json({error : err.message})
}
}


module.exports ={
    popularPage,
    popularProducts,
    popularCategory,
}