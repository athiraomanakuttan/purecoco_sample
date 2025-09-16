const validation = require("../../public/user/validation");
const clientCollection = require("../../Schema/clientModel");
const generateOTP = require("../../Service/otpGenerator");
const bcrypt = require("bcrypt");
const sendOtpMail = require("../../Service/mailSender");
const productCollection = require("../../Schema/productModel");
const categoryCollection = require("../../Schema/categoryModel");
const session = require("express-session");
const { ObjectId } = require("mongodb");

const indexPage = async (req, res) => {
  try {
    const productData = await productCollection
      .find({ product_status: 1 })
      .limit(12);
    const categoryData = await categoryCollection.find({ category_status: 1 });
    res.render("./user/index", { productData, categoryData });
  } catch (err) {
    console.log(err);
    res.render("./user/index");
  }
};

const showSignUp = (req, res) => {
  const data = {};
  let actionResponce = {};
  res.render("./user/signup", { data, actionResponce });
};

const addUser = async (req, res) => {
  let actionResponce = {};
  const data = {
    firstName: req.body.first_name,
    lastName: req.body.last_name,
    emailId: req.body.emailId,
    phoneNumber: req.body.phoneNumber,
    password: req.body.password,
  };
  const response = validation.signupValidation(data);

  if (response.status) {
    try {
      const exist = await clientCollection.findOne({
        customer_emailid: data.emailId,
        customer_status: 1,
      });
      if (!exist) {
        // const insertClient = await clientCollection.insertMany(data)
        const otp = generateOTP();
        sendOtpMail(data.emailId, otp);
        const currentTime = new Date().getTime(); // Geting the current time in milliseconds to set the timer for OTP
        req.session.otpGenerationTime = currentTime;
        req.session.OTP = otp;
        req.session.firstName = data.firstName;
        req.session.lastName = data.lastName;
        req.session.emailId = data.emailId;
        req.session.phoneNumber = data.phoneNumber;
        req.session.password = req.body.password;
        actionResponce["status"] = true;
        actionResponce["message"] = ` OTP has sended to the ${data.emailId}`;
        res.render("./user/otp-verification", {
          actionResponce,
          otpGenerationTime: currentTime,
        });
      } else {
        actionResponce["status"] = false;
        actionResponce["message"] =
          "An account with this email address already exists. Please try using a different email address.";
        res.render("./user/signup", { data, actionResponce });
      }
    } catch (err) {
      actionResponce["status"] = false;
      actionResponce["message"] = err;
      res.render("./user/signup", { data, actionResponce });
    }
  } else {
    actionResponce["status"] = false;
    actionResponce["message"] = response["message"];
    res.render("./user/signup", { data, actionResponce });
  }
};

const resendOTP = (req, res) => {
  let actionResponce = {};
  const otp = generateOTP();
  req.session.OTP = otp;
  sendOtpMail(req.session.emailId, otp);
  const currentTime = new Date().getTime(); // Geting the current time in milliseconds to set the timer for OTP
  req.session.otpGenerationTime = currentTime;
  actionResponce["status"] = true;
  actionResponce["message"] = ` OTP has Resend to the ${req.session.emailId}`;
  res.render("./user/otp-verification", {
    actionResponce,
    otpGenerationTime: currentTime,
  });
};
const resendPasswordOTP = (req, res) => {
    let actionResponce = {};
    const otp = generateOTP();
    req.session.OTP = otp;
    sendOtpMail(req.session.emailId, otp);
    const currentTime = new Date().getTime(); // Geting the current time in milliseconds to set the timer for OTP
    req.session.otpGenerationTime = currentTime;
    actionResponce["status"] = true;
    actionResponce["message"] = ` OTP has Resend to the ${req.session.emailId}`;
    res.render("./user/resetOtpVerification", {
        actionResponce,
        otpGenerationTime: currentTime,
      });
  };

const verifyOTP = async (req, res) => {
  let actionResponce = {};
  const userOTP = req.body.userOTP;
  if (
    req.session.OTP &&
    userOTP &&
    Number(req.session.OTP) === Number(userOTP)
  ) {
    let fullName = req.session.firstName + " " + req.session.lastName;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.session.password, saltRounds);

    const data = {
      customer_name: fullName,
      customer_emailid: req.session.emailId,
      customer_phone: Number(req.session.phoneNumber),
      customer_password: hashedPassword,
      customer_status: Number(1),
      timestamp: Date.now(),
    };

    try {
      const addUser = await clientCollection.insertMany(data);
      if (addUser) {
        req.session.OTP = "";
        req.session.lastName = "";
        req.session.phoneNumber = "";
        req.session.user = addUser._id;
        res.redirect("/login");
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    actionResponce["status"] = false;
    actionResponce["message"] = "Incorrect OTP! Plase verify the OTP";
    res.render("./user/otp-verification", { actionResponce,otpGenerationTime: req.session.otpGenerationTime, });
  }
};
const otpExpired = (req, res) => {
  let actionResponce = {};
  req.session.otpGenerationTime = 0;
  actionResponce["status"] = true;
  actionResponce["message"] = `Time expired. Request for a new OTP`;
  res.render("./user/otp-verification", {
    actionResponce,
    otpGenerationTime: req.session.otpGenerationTime,
  });
};

const loginLoad = (req, res) => {
  let data = {};
  let actionResponce = {};
  let email = "";
  res.render("./user/loginPage", { actionResponce, data, email });
};

const userLogin = async (req, res) => {
  let actionResponce = {};
  const data = {
    email: req.body.emailId,
    password: req.body.password,
  };

  const valid = validation.loginValidation(data.email);
  if (valid.status) {
    try {
      const getUser = await clientCollection.findOne({
        customer_emailid: data.email,
        customer_status: 1,
      });
      if (getUser !== null) {
        const match = await bcrypt.compare(
          data.password,
          getUser.customer_password
        );

        if (match) {
          req.session.user = getUser._id;
          req.session.userEmail = data.email
          return res.redirect("/");
        } else {
          actionResponce["status"] = false;
          actionResponce["message"] = "Incorrect password";
          return res.render("./user/loginPage", {
            actionResponce,
            email: data.email,
          });
        }
      } else {
        actionResponce["status"] = false;
        actionResponce["message"] = "User not found or inactive";
        return res.render("./user/loginPage", {
          actionResponce,
          email: data.email,
        });
      }
    } catch (err) {
      console.error("Error during login:", err);
      actionResponce["status"] = false;
      actionResponce["message"] = "An error occurred. Please try again.";
      return res.render("./user/loginPage", {
        actionResponce,
        email: data.email,
      });
    }
  } else {
    actionResponce["status"] = false;
    actionResponce["message"] = "Email id is not in required format";
    res.render("./user/loginPage", { actionResponce, data, email: data.email });
  }
};

// --------------- Handleing user Logout -----------------

const logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Failed to logout");
      }
      req.locals = null; // Clear req.locals seted for navbar icons
      res.redirect("/");
    });
  }
};


// ---------------- Reset password page load --------------
const resetPassword = (req, res) => {
  const actionResponce = {};
  res.render("./user/resetPassword", { actionResponce });
};

// -------------- Send verification OTP Mail ----------

const verifyEmail = async (req, res) => {
  const email = req.body.emailId;
  const actionResponce = {};
  try {
    const exist = await clientCollection.findOne({
      customer_emailid: email,
      customer_status: 1,
    });
    if (exist !== null) {
      // const insertClient = await clientCollection.insertMany(data)
      const otp = generateOTP();
      sendOtpMail(email, otp);
      const currentTime = new Date().getTime(); // Get the current time in milliseconds to set the timer for OTP

      req.session.otpGenerationTime = currentTime;
      req.session.OTP = otp;
      req.session.emailId = email;

      const actionResponce = {
        status: true,
        message: `OTP has been sent to the ${email}`,
      };
      res.render("./user/resetOtpVerification", {
        actionResponce,
        otpGenerationTime: currentTime,
      });
    } else {
      actionResponce["status"] = false;
      actionResponce["message"] = ` No user Found with this email id`;
      res.render("./user/resetPassword", { actionResponce });
    }
  } catch (err) {
    console.log(err)
  }
};

const passwordOtpVerify= (req,res)=>{
    let actionResponce = {};
  const userOTP = req.body.userOTP;
  if ( req.session.OTP && userOTP && Number(req.session.OTP) === Number(userOTP)
  ) {
        res.render('./user/newPassword',{actionResponce})
  }
  else
  {
    actionResponce={
        status : false,
        message : "Incorrect OTP"
    }
    res.render("./user/resetOtpVerification", {
        actionResponce,
        otpGenerationTime: req.session.otpGenerationTime,
      });
  }

}

// ------------------ Update password -------------- 

const updatePassword = async (req, res) => {
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const verified = validation.passwordValidation(password);
    let actionResponce = {};

    if (verified.status) {
        if (password === confirmPassword) {
            try {
                const getUser = await clientCollection.findOne({ customer_emailid: req.session.emailId });
                if (getUser !== null) {
                    const salt = 10;
                    const newPassword = await bcrypt.hash(password, salt);
                    await clientCollection.findByIdAndUpdate(
                        { _id: new ObjectId(getUser._id) },
                        { $set: { customer_password: newPassword } }
                    );
                    actionResponce = {
                        status: true,
                        message: "Password Updated Successfully. Please Login With new password"
                    };
                    return res.render("./user/loginPage", {
                        actionResponce,
                        email: req.session.emailId,
                    });
                } else {
                    actionResponce = {
                        status: false,
                        message: "Something went wrong. Try again."
                    };
                    res.render('./user/newPassword', { actionResponce });
                }
            } catch (err) {
                console.log(err);
                actionResponce = {
                    status: false,
                    message: "Something went wrong. Try again."
                };
                res.render('./user/newPassword', { actionResponce });
            }
        } else {
            actionResponce = {
                status: false,
                message: "Password and confirm password do not match."
            };
            res.render('./user/newPassword', { actionResponce });
        }
    } else {
        actionResponce = {
            status: false,
            message: "Password is not in the required format. Password must contain alphabets, letters, and a minimum of 6 characters."
        };
        res.render('./user/newPassword', { actionResponce });
    }
};

// ----------------------------- login with login ---------------------- 
const googleLogin = async (req,res)=>{
  let actionResponce={}
  const { displayName, emails, phoneNumbers } = req.user;
  const fullName = displayName;
  const email = emails ? emails[0].value : null;
  const phoneNumber = phoneNumbers ? phoneNumbers[0].value : null;

  try
  {
    if(email!=='' || email!== null)
      {
        const getUser = await clientCollection.findOne({customer_emailid : email})
        if(getUser!== null && getUser.customer_status==1)
          {
            req.session.user = getUser._id;
            req.session.email = email
          }
          else if(getUser!== null && getUser.customer_status!==1)
            {
              await clientCollection.findOneAndUpdate({_id:new ObjectId(getUser._id)},{$set:{customer_status:1}})
              req.session.user = getUser._id;
              req.session.email = email;
            }
            else if(getUser==null){
              let password = '111122wwwwwwwwwww'
              const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
              const data={
                customer_name:fullName,
                customer_emailid:email,
                customer_status:1,
                customer_phone:7012361213,
                timestamp:Date.now(),
                customer_password:hashedPassword
              }
              const newUser = await clientCollection.insertMany(data)
              if(newUser){
                
              req.session.user = newUser._id;
              req.session.email = newUser.customer_emailid;
              res.redirect('/')
              }
              else
              {
                actionResponce={
                  status:false,
                  message:"something went Wrong. Please try again"
                }
                const data={}
                res.render("./user/signup", { data, actionResponce });
              }
            }
      }
  }
  catch(err)
  {
    console.log(err)
    actionResponce={
      status:false,
      message:"something went Wrong. Please try again"
    }
    const data={}
    res.render("./user/signup", { data, actionResponce });
    
  }
  console.log(email)
  res.redirect('/')
}



module.exports = {
  indexPage,
  showSignUp,
  addUser,
  verifyOTP,
  resendOTP,
  otpExpired,
  loginLoad,
  userLogin,
  logout,
  resetPassword,
  verifyEmail,
  passwordOtpVerify,
  resendPasswordOTP,
  updatePassword,
  googleLogin
};
