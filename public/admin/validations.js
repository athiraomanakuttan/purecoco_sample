const { response } = require("express");

const loginValidation = (data) => {
  const emailPattern =
    /^(?!.*\.\d)(?=[a-zA-Z0-9._%+-]*[a-zA-Z]{3,}\d*@)[a-zA-Z0-9._%+-]+@[a-z]{3,}\.[a-z]{2,}$/i;
  const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{7,}$/;
  const { email, password } = data;
  let response = {};
  if (email == "" || email == null || ! emailPattern.test(email)) {
    response = {
      error: true,
      message: "Email is not in a requird format",
    };
    return response;
  } else if (
    password === "" ||
    password === null ||
    !passwordPattern.test(password)
  ) {
    response = {
      error: true,
      message: "Password is not in a requird format",
    };
    return response;
  } else {
    response = {
      error: false,
      message: "",
    };
    return response;
  }
};


function productValidation(data)
{
  let responce={}
  if(data.product_name === null || data.product_name==="")
    {
      responce={
        error: true,
        message: "Product name Required. Please Try Again",
      }
    }
    else if(data.product_price== null || data.product_price== "" || data.product_price<=0 )
      {
        responce={
          error: true,
          message: "Invalid Product Price. Please Try Again",
        }
      }
      
        else if(data.product_stock== null || data.product_stock== "" || data.product_stock<=0 )
          {
            responce={
              error: true,
              message: "Invalid Product Stock. Please Try Again",
            }
          }
          else {
            responce={
              error: false,
              message:"",
            }
            }
            return responce
}
module.exports = { loginValidation ,productValidation };
