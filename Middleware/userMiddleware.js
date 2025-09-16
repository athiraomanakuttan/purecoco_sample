const { ObjectId } = require("mongodb");
const clientCollection = require("../Schema/clientModel");
const isUserLogedIn = (req, res, next) => {
  res.locals.isLoggedIn = req.session.user || false;
  next();
};
const userSessionCheck = async (req, res, next) => {
  let data = {};
  if (req.session.user) {
    data = await clientCollection.findOne({
      _id: new ObjectId(req.session.user),
      customer_status: 1,
    });
  }
  if (req.session.user && data !== null) {
    next();
  } else {
    if(req.session.user){
    req.session.destroy()}
    res.redirect("/login");
  }
  
};
module.exports = { isUserLogedIn, userSessionCheck };
