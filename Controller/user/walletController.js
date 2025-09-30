const walletCollection = require('../../Schema/walletModel')
const mongoose  = require('mongoose')

const getwallet = async (req, res) => {
  const userId = req.session.user;
  const page = parseInt(req.query.page) || 1;  // current page
  const limit = 5; // transactions per page
  const skip = (page - 1) * limit;

  try {
    let result = await walletCollection.aggregate([
  { $match: { customer_id: new mongoose.Types.ObjectId(userId) } },
  { $unwind: { path: "$transaction", preserveNullAndEmptyArrays: true } },
  { $sort: { "transaction.transaction_date": -1 } },
  {
    $project: {
      wallet_balance: 1,
      wallet_amount: "$transaction.wallet_amount",
      order_id: "$transaction.order_id",
      transactionType: "$transaction.transactionType",
      transaction_date: "$transaction.transaction_date"
    }
  },
  {
    $facet: {
      paginatedResults: [
        { $skip: skip },
        { $limit: limit }
      ],
      totalCount: [
        { $count: "count" }
      ]
    }
  }
]);


    const walletDataRaw = await walletCollection.findOne({ customer_id: userId }).lean();

    const transactions = result[0].paginatedResults || [];
    const totalCount = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const walletData = {
      wallet_balance: walletDataRaw?.wallet_balance || 0.0,
      transaction: transactions,
    };

    res.render("./user/walletPage", {
      walletData,
      formatDate,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};
// ----------------------- Other functions -------------------- 

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    
    const parts = formattedDate.split(' ');
    const day = parts[1].replace(',', '');
    const month = parts[0];
    const year = parts[2];
    
    return { day :day , month : month, year: year };
}

module.exports ={
    getwallet
}