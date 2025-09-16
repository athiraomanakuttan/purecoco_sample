const walletCollection = require('../../Schema/walletModel')

const getwallet = async (req,res) => {
        const userId = req.session.user;
        try
        {
            let walletData= await walletCollection.findOne({customer_id:userId}).sort({'transaction.transaction_date':-1})
            if(!walletData)
            {
                walletData ={
                    wallet_balance : 0.00,
                    transaction:[]
                }
            }
            res.render('./user/walletPage',{walletData,formatDate})
        }catch(err){
            console.log(err)
        }
}

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