const validation = require("../../public/admin/validations");
const categoryCollection = require("../../Schema/categoryModel");
const dbConnection = require("../../Config/dbConnect");
const { ObjectId } = require("mongodb");
let globalNotification = {};

// ----------------------------------- Showing all categorys  -----------------------
const listCategory = async (req, res) => {
  let notification = {};
  const category = req.query.category || "";
  const order = req.query.order || "";
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  const skip = (page - 1) * limit;

  let sortQuery = {};
  if (globalNotification.status) {
    notification = globalNotification;
    globalNotification = {};
  }

  if (category && order) {
    sortQuery[category] = order === "asc" ? 1 : -1;
  } else {
    sortQuery["timestamp"] = -1;
  }

  try {
    const totalCount = await categoryCollection.countDocuments({
      category_status: { $ne: -1 },
      category_name: { $regex: search, $options: "i" },
    });

    const totalPages = Math.ceil(totalCount / limit);

    const categoryData = await categoryCollection
      .find({
        category_status: { $ne: -1 },
        category_name: { $regex: search, $options: "i" },
      })
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const categoryCount = await getCategoryCount();

    res.render("./admin/categoryList", {
      categoryData,
      dateFormat,
      notification,
      categoryCount,
      page,
      totalPages,
      search,
      order,
      category,
    });
  } catch (err) {
    console.log("Error occurred: " + err);
  }
};


// --------------------------- Adding new category ----------------------------------

const addCategory = async (req, res) => {
  let category_name = req.body.category_name;
  if (category_name != "") {
    category_name = category_name.trim();
    category_name = category_name.toLowerCase();

    const category = {
      category_name: category_name,
      category_status: 1,
      timestamp: Date.now(),
    };
    try {
      const exists = await categoryCollection.findOne({
        category_name: category_name,
        category_status: 1,
      });
      if (exists === null) {
        await categoryCollection
          .insertMany(category)
          .then(() => {
            globalNotification["status"] = "success";
            globalNotification["message"] = "Category added Successfully";
          })
          .catch((err) => {
            globalNotification["status"] = "error";
            globalNotification["message"] = "Something went Wrong";
            console.log("error occured" + err);
          });
      } else {
        // flas messgae go here
        globalNotification["status"] = "error";
        globalNotification["message"] = "Category already Exists";
      }
    } catch (err) {
      globalNotification["status"] = "error";
      globalNotification["message"] = "Something went Wrong";
      console.log("error occured" + err);
    }
  }
  res.redirect(`/admin/category`);
};

// ---------------------------------------- Deleting  A category --------------------------

const removeCategory = async (req, res) => {
  const id = req.params.id;
  try {
    const updateCategory = await categoryCollection.findByIdAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { category_status: -1 } }
    );
    globalNotification["status"] = "success";
    globalNotification["message"] = "category deleted successfuly";
  } catch (err) {
    globalNotification["status"] = "error";
    globalNotification["message"] = "Something went wrong";
    console.log("unable to delete the category" + err);
  }

  res.redirect(`/admin/category`);
};

// --------------------------- Edit category -------------------------

const editCategory = async (req, res) => {
  const id = req.params.id;
  if (id) {
    try {
      const categoryData = await categoryCollection.findOne(
        { _id: new ObjectId(id), category_status: { $ne: -1 } },
        {}
      );
      res.render("./admin/editCategory", { categoryData });
    } catch (err) {
      // flas messgae go here
      globalNotification["status"] = "error";
      globalNotification["message"] = "Something went wrong";
      console.log("Not able to fetch data " + err);
      res.redirect(`/admin/category`);
    }
  } else {
    globalNotification["status"] = "error";
    globalNotification["message"] = "Something went wrong";
    res.redirect(`/admin/category`);
  }
};

// ---------------------------- Update category -------------------------------

const updateCategory = async (req, res) => {
  const id = req.params.id;
  let new_name = req.body.category_name;
  new_name = new_name.trim();
  new_name = new_name.toLowerCase();
  try {
    const exists = await categoryCollection.findOne({
      category_name: new_name,
      category_status: 1,
    });
    if (exists == null) {
      await categoryCollection
        .findByIdAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { category_name: new_name } }
        )
        .then(() => {
          globalNotification["status"] = "success";
          globalNotification["message"] = "category Updated successfuly";
        })
        .catch((err) => {
          globalNotification["status"] = "error";
          globalNotification["message"] = "Something went wrong";

          console.log("can't update category" + err);
        });
    } else {
      globalNotification["status"] = "error";
      globalNotification["message"] = "Category already exixts";
    }
  } catch (err) {
    globalNotification["status"] = "error";
    globalNotification["message"] = "Something went wrong";

    console.log("can't update category" + err);
  }

  res.redirect(`/admin/category`);
};

// ------------------------------ formating timestamp to required format --------------------

function dateFormat(inputDate) {
  const formated = new Date(inputDate);

  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDate = formated.toLocaleDateString("en-US", options);
  return formattedDate;
}

// ---------------------------------- Get available category Count ----------------

async function getCategoryCount() {
  return await categoryCollection
    .find({ category_status: { $ne: -1 } })
    .count();
}

module.exports = {
  listCategory,
  addCategory,
  removeCategory,
  editCategory,
  updateCategory,
};
