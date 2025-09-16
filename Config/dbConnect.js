const  mongoose  = require("mongoose");
const dotenv =  require('dotenv')
dotenv.config()

const connection = mongoose.connect(process.env.DB_URI || 'mongodb://localhost:27017/pure_qoqo')
connection.then(()=>console.log("connection successfull")).catch((err)=> console.log(`conncetion failed error : ${err}`))
 
module.exports= {mongoose, connection};