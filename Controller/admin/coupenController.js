const { ObjectId } = require("mongodb");
const coupenCollection = require("../../Schema/coupenModel");
const voucher_codes = require("voucher-code-generator");
let globalNotification = {};

// ---------------------------- Show  the coupen page ------------------------
const showCoupen = async (req, res) => {
  const order = req.query.order || "";
  const category = req.query.category || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  let sort = {};
  var notification = {};

  if (globalNotification.status) {
    notification = globalNotification;
    globalNotification = {};
  }

  if (category) {
    sort[category] = order === "asc" ? 1 : -1;
  } else {
    sort = { createdAt: -1 };
  }

  try {
    await checkCoupenStatus();

    const totalCoupens = await coupenCollection.countDocuments({ coupen_status: 1 });
    const totalPages = Math.ceil(totalCoupens / limit);

    const coupenData = await coupenCollection
      .find({ coupen_status: 1 })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.render("./admin/coupen", {
      notification,
      coupenCount: totalCoupens,
      coupenData,
      convertDateString,
      page,
      totalPages,
      order,
      category
    });
  } catch (err) {
    console.log(err);
  }
};

// ------------------------------- add new coupen -----------------
const addCoupen = async (req, res) => {
  const data = {
    coupen_name: req.body.coupen_name,
    coupen_amount_limit: req.body.coupen_amount_limit,
    coupen_expiry: req.body.coupen_expiry,
    coupen_type: req.body.coupen_type,
    coupen_offer_amount: req.body.coupen_offer_amount,
  };
  const checkExist = await coupenCollection.findOne({
    coupen_name: data.coupen_name,
    coupen_status: 1,
  });
  if (!checkExist) {
    data.coupen_code = await getCoupenCode();
    try {
      const addCoupen = await coupenCollection.insertMany(data);
      console.log(addCoupen);
      if (addCoupen) {
        globalNotification = {
          status: "success",
          message: "Coupen added successfully",
        };
      } else {
        globalNotification = {
          status: "error",
          message: "Some error occured. Try again ",
        };
      }
    } catch (err) {
      globalNotification = {
        status: "error",
        message: "Some error occured. Try again ",
      };
      console.log(err);
    }
  } else {
    globalNotification = {
      status: "error",
      message: "Coupen Name is already exist",
    };
  }
  res.redirect("/admin/coupens");
};

// ----------------------- remove coupens --------------------------

const removeCoupen = async (req, res) => {
  const id = req.params.id;
  try {
    const removeCoupen = await coupenCollection.findOneAndDelete({ _id: id });
    if (removeCoupen) {
      globalNotification = {
        status: "success",
        message: "Coupen Deleted successfully",
      };
    } else {
      globalNotification = {
        status: "error",
        message: "Something went wrong. Try again",
      };
    }
  } catch (err) {
    console.log(err);
    globalNotification = {
      status: "error",
      message: "Something went wrong. Try again",
    };
  }

  res.redirect("/admin/coupens");
};
// ---------------- load coupen edit page --------------

const editCoupen = async (req, res) => {
  let notification = {};
  if (globalNotification.status) {
    notification = globalNotification;
    globalNotification = {};
  }
  const id = req.params.id;
  try {
    const coupenData = await coupenCollection.findOne({ _id: id });
    if (coupenData) {
      res.render("./admin/coupenEdit", {
        coupenData,
        notification,
        dateFormat,
        convertDateString,
      });
    }
  } catch (err) {
    console.log(err);
  }
};

// -------------------- update coupen ------------------------

const updateCoupen = async (req, res) => {
  const id = req.params.id;

  const data = {
    coupen_name: req.body.coupen_name,
    coupen_amount_limit: req.body.coupen_amount_limit,
    coupen_expiry: req.body.coupen_expiry,
    coupen_type: req.body.coupen_type,
    coupen_offer_amount: req.body.coupen_offer_amount,
  };

  try {
    // Checking for existing coupon
    const checkExist = await coupenCollection.findOne({
      coupen_name: data.coupen_name,
      coupen_status: 1,
      _id: { $ne: new ObjectId(id) },
    });

    if (!checkExist) {
      // Update the coupon
      const updateCoupen = await coupenCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: data }
      );
      if (updateCoupen) {
        res.redirect("/admin/coupens");
      } else {
        globalNotification = {
          status: "error",
          message: "Failed to update coupon",
        };
        res.redirect(`/admin/editCoupen/${id}`);
      }
    } else {
      globalNotification = {
        status: "error",
        message: "The Coupen Name already exists",
      };
      res.redirect(`/admin/editCoupen/${id}`);
    }
  } catch (err) {
    console.log("Error:", err);
    res.redirect(`/admin/editCoupen/${id}`);
  }
};

// ----------------------------- other functions -------------------------

function dateFormat(inputDate) {
  const formated = new Date(inputDate);

  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDate = formated.toLocaleDateString("en-US", options);
  return formattedDate;
}

async function getCoupenCode() {
  const voucher = voucher_codes
    .generate({
      length: 8,
      count: 1,
      charset: voucher_codes.charset("alphanumeric"),
    })[0]
    .toUpperCase();
  const checkExist = await coupenCollection.findOne({ coupen_code: voucher });
  if (checkExist == null) {
    return voucher;
  } else {
    getCoupenCode();
  }
}

async function checkCoupenStatus() {
  try {
    const currentDate = new Date();
    const result = await coupenCollection.deleteMany(
      { coupen_expiry: { $lt: currentDate } },
      { $set: { coupen_status: 0, updatedAt: currentDate } }
    );
    console.log(result);
  } catch (err) {
    console.log(err);
  }
}

function convertDateString(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() is zero-based
  const day = String(date.getDate()).padStart(2, "0"); // Adding 2 days to the date
  return `${year}-${month}-${day}`;
}

module.exports = {
  showCoupen,
  addCoupen,
  removeCoupen,
  editCoupen,
  updateCoupen,
};
