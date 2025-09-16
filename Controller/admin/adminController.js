const validation = require("../../public/admin/validations");
const clientCollection = require("../../Schema/clientModel");
const orderCollection = require("../../Schema/orderModel");
const dbConnection = require("../../Config/dbConnect");
const { ObjectId } = require("mongodb");
const productModel = require("../../Schema/productModel");

// --------------------------------------- Login Page Loading -------------------

const loadAdminLogin = (req, res) => {
  res.render("./admin/login", { error: null, message: "", formValues: {} });
};

// --------------------------------------- Admin Login -------------------------

const adminLogin = (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASS;
  const data = {
    email: req.body.adminEmail,
    password: req.body.adminPassword,
  };
  const valid = validation.loginValidation(data);
  if (valid.error) {
    res.render("./admin/login", {
      error: true,
      message: valid.message,
      formValues: data,
    });
  } else {
    if (!(data.email === adminEmail) || !(data.password === adminPassword)) {
      res.render("./admin/login", {
        error: true,
        message: "Incorrect Email or password",
        formValues: data,
      });
    } else {
      req.session.adminEmail = data.email;
      res.redirect("/admin/dashboard");
    }
  }
};

// ------------------------------------------------ Dashboard loading ----------------------

const loadDashBoard = async (req, res) => {
  const userCount = await getUserCount();
  const pendingOrder = await orderCollection
    .find({ orderStatus: "Pending" })
    .count();
  const totalAmount = await orderCollection.aggregate([
    { $match: { orderStatus: { $in: ["Confirmed", "Delivered", "Shipped"] } } },
    { $group: { _id: null, totalPrice: { $sum: "$totalPrice" } } },
  ]);
  const totalSales = await orderCollection
    .find({
      orderStatus: { $in: ["Confirmed", "Delivered", "Shipped", "Pending"] },
    })
    .count();
  const totalPrice = totalAmount.length > 0 ? (totalAmount[0].totalPrice).toFixed(2) : 0;

  res.render("./admin/dashboard", {
    userCount,
    pendingOrder,
    totalPrice,
    totalSales,
  });
};

// ------------------------------------------------- User List Loading --------------------

const clientsListLoad = async (req, res) => {
  const search = req.query.search || "";
  const sort = req.query.sort || "";
  const category = req.query.category || "";
  let query = { customer_status: { $ne: -1 } };
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  let responce = {};

  if (search !== "") {
    query = {
      ...query,
      $or: [
        { customer_name: { $regex: search, $options: "i" } },
        { customer_emailid: { $regex: search, $options: "i" } },
      ],
    };
  }

  try {
    const totalClients = await clientCollection.countDocuments(query);
    const totalPages = Math.ceil(totalClients / limit);

    let clientData;
    if (sort && category) {
      const sortOption = {};
      sortOption[category] = sort === "asc" ? 1 : -1;
      clientData = await clientCollection
        .find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit);
    } else {
      clientData = await clientCollection.find(query).skip(skip).limit(limit);
    }

    const userCount = await getUserCount();

    res.render("./admin/userList", {
      clientData,
      dateFormat,
      page,
      totalPages,
      responce,
      userCount,
    });
  } catch (err) {
    console.log(err);
  }
};



// -------------------------------------------------user Enable Disable Delete ------------------

const updateClientStatus = async (req, res) => {
  const status = Number(req.params.status);
  const id = req.params.id; // Use response for consistency
  let search = "";

  if (status >= -1 && status <= 1) {
    try {
      const updateResult = await clientCollection.findByIdAndUpdate(id, {
        customer_status: status,
      });

      if (updateResult != null) req.flash("message", "Client status updated");
    } catch (err) {
      console.log("cant update the user" + err);
    }
  } else {
    console.log("cant update the user");
  }
  res.redirect(`/admin/clients`);
};

// --------------------------------------------------- Admin Logout ---------------------------

const logout = (req, res) => {
  req.session.destroy();
  res.redirect("/admin");
};

// ---------------------------------------------------- Format Timestamp --------------------
function dateFormat(inputDate) {
  const formated = new Date(inputDate);

  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDate = formated.toLocaleDateString("en-US", options);
  return formattedDate;
}

// ----------------------------------------------------- Get count of total active users ---------------------
async function getUserCount() {
  return await clientCollection.find({ customer_status: { $ne: -1 } }).count();
}

module.exports = {
  loadAdminLogin,
  adminLogin,
  loadDashBoard,
  clientsListLoad,
  updateClientStatus,
  logout,
};
