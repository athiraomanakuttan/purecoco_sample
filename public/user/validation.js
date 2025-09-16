function signupValidation(data) {
    let res = {}
    const namePattern = /^[A-Za-z\s]+$/;
    const emailPattern = /^(?!.*\.\d)(?=[a-zA-Z0-9._%+-]*[a-zA-Z]{3,}\d*@)[a-zA-Z0-9._%+-]+@[a-z]{3,}\.[a-z]{2,}$/i;
    const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{7,}$/;
    const phonePattern = /^\d{10}$/

    if (
        data.firstName == '' ||
        data.firstName == null ||
        !namePattern.test(data.firstName)
    ) {
        res['status'] = false;
        res['message'] = 'Your first name is not valid';
        return res;
    }
    else if (
        data.lastName == '' ||
        data.lastName == null ||
        !namePattern.test(data.lastName)
    ) {
        res['status'] = false;
        res['message'] = 'Your Last name is not valid';
        return res;
    }
    else if (
        data.emailId == '' ||
        data.emailId == null ||
        !emailPattern.test(data.emailId)
    ) {
        res['status'] = false;
        res['message'] = 'Email not in a required format';
        return res;
    }
    else if (
        data.phoneNumber == '' ||
        data.phoneNumber == null ||
        !phonePattern.test(data.phoneNumber)
    ) {
       
        res['status'] = false;
        res['message'] = 'Phone number not in a required format';
        return res;
    }
    else if (
        data.password == '' ||
        data.password == null ||
        !passwordPattern.test(data.password)
    ) {
        res['status'] = false;
        res['message'] = 'Password is not valid. It must contain at least one alphabet, one number, and be at least 6 characters long';
        return res;
    }
    else {
        res['status'] = true;
        return res;
    }
}
function loginValidation(email) {
    let res = {}
    const emailPattern = /^(?!.*\.\d)(?=[a-zA-Z0-9._%+-]*[a-zA-Z]{3,}\d*@)[a-zA-Z0-9._%+-]+@[a-z]{3,}\.[a-z]{2,}$/i;
    if (email == null || !email || !emailPattern.test(email)) {
        res['status'] = false;
        res['message'] = 'Email Id not in required format ';
        return res;
    }
    else {
        res['status'] = true;
        return res;
    }

}
function passwordValidation(password) {
    let res = {}
    const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{7,}$/;
    if (password == null || !password || !passwordPattern.test(password)) {
        res['status'] = false;
        res['message'] = 'password not in required format ';
        return res;
    }
    else {
        res['status'] = true;
        return res;
    }
}
function userUpdateValidation(data) {
    const namePattern = /^[A-Za-z\s]+$/;
    const emailPattern = /^(?!.*\.\d)(?=[a-zA-Z0-9._%+-]*[a-zA-Z]{3,}\d*@)[a-zA-Z0-9._%+-]+@[a-z]{3,}\.[a-z]{2,}$/i;
    const phonePattern = /^\d{10}$/
    let responce;
    if (data.customer_name == "" || data.customer_name === null || !namePattern.test(data.customer_name)) {
        responce = {
            status: false,
            message: " Name not in required format "
        }
    }

    else if (data.customer_phone == "" || data.customer_phone === null || !phonePattern.test(data.customer_phone)) {
        responce = {
            status: false,
            message: " Phone Number not in required format "
        }
    }
    else {
        responce = {
            status: true
        }
    }
    return responce;
}

function addressValidation(data) {
    const stringPattern = /^[A-Za-z\s]+$/;
    const pincodePattern = /^\d{6}$/
    const phonePattern = /^\d{10}$/
    let responce = {}
    if (data.building === '' || data.building === null) {
        responce = {
            status: false,
            message: "Flat, House no., Building, Company, Apartment is empty"
        }
    }
    else if (data.street === '' || data.street === null) {
        responce = {
            status: false,
            message: "street address is empty"
        }
    }
    else if (data.city === '' || data.city === null || !stringPattern.test(data.city)) {
        responce = {
            status: false,
            message: "city is not in required format"
        }
    }
    else if (data.state === '' || data.state === null || !stringPattern.test(data.state)) {
        responce = {
            status: false,
            message: "state is not in required format"
        }
    }
    else if (data.country === '' || data.country === null || !stringPattern.test(data.country)) {
        responce = {
            status: false,
            message: "state is not in required format"
        }
    }
    else if (data.pincode === '' || data.pincode === null || !pincodePattern.test(data.pincode)) {
        responce = {
            status: false,
            message: "pincode is not in required format"
        }
    }
    else if (data.landmark === '' || data.landmark === null) {
        responce = {
            status: false,
            message: "Landmark is not in required format"
        }
    }
    else if (data.phonenumber === '' || data.phonenumber === null || !phonePattern.test(data.phonenumber)) {
        responce = {
            status: false,
            message: "phonenumber is not in required format"
        }
    }
    else {
        responce = {
            status: true
        }
    }
    return responce;


}

module.exports = { signupValidation, loginValidation, passwordValidation, userUpdateValidation, addressValidation }