const { ObjectId } = require('mongodb');
const clientCollection = require('../../Schema/clientModel')
const validation = require('../../public/user/validation')
let globalNotification ={}


// -------------------------------- Show user Profile ------------------------ 
const showProfile= async (req,res)=>{
    let notification= {}
    if(globalNotification.status){
        notification= globalNotification;
        globalNotification={}
    }
    let data={}
    const id= req.session.user
    const email= req.session.email
    try
    {
        data= await clientCollection.findOne({_id : new ObjectId(id), customer_status:1})
        res.render('./user/userProfile',{data,notification})
    }
    catch(err){    console.log(err)     }
}

// ------------------------------------- Update user Profile ---------------------- 
const updateProfile = async (req,res)=>{
    const data={
        customer_name : req.body.userName,
        customer_emailid : req.session.userEmail,
        customer_phone : req.body.phoneNumber
    }
    const id= req.session.user
    const validate = validation.userUpdateValidation(data)
    if(validate.status)
        {
            
           try{
            const updateUser= await clientCollection.findOneAndUpdate({_id : new ObjectId(id)},{
                $set:{ customer_name:data.customer_name , customer_phone: data.customer_phone}
            })
            
            globalNotification={
                status:'success',
                message:"Profile Updated Successfully"
            }
            res.redirect('/profile')
           }
           catch(err)
           {
            console.log(err)
           }
        }
        else
        {
            
            let notification={
                status :'error',
                message:validate.message
            }
            res.render('./user/userProfile',{data,notification})
        }
}

// -------------------------------------- ADD  new address to user ------------------ 
const addAddress =async (req,res)=>{
    const id= req.session.user
    const data= {
        building:req.body.building,
        street:req.body.street,
        city:req.body.city,
        state:req.body.state,
        country:req.body.country,
        pincode:req.body.pincode,
        phonenumber:req.body.phonenumber,
        landmark:req.body.landmark
    }
    
    const valiate = validation.addressValidation(data);
    if(valiate.status)
        {
            try
            {
                const result = await clientCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $push: { customer_address: data } }
                );
                if (result.modifiedCount > 0) {
                    globalNotification = {
                        status: 'success',
                        message: "Address added successfully"
                    };
                }
                    res.redirect('/profile')
            }
            catch(err)
            {
                globalNotification={
                    status:'error',
                    message:"Something went wrong. Try again"
                }
                console.log(err)
                res.redirect('/profile')
            }
        }
        else
        {
            globalNotification={
                status:'error',
                message:valiate.message
            }
            res.redirect('/profile')
        }
}

// ------------------- Edit address page load ----------------- 

const editAddress= async(req,res)=>{
    let notification= {}
    if(globalNotification.status){
        notification= globalNotification;
        globalNotification={}
    }
    const index = Number(req.params.index)
    const id = req.session.user
    try
    {
        const getAddress = await clientCollection.aggregate([
            { $match: { _id: new ObjectId(id) } },
            { $project: { customer_address: { $arrayElemAt: ["$customer_address", index] } } }
        ])
        
        if(getAddress!== null)
            {
                res.render('./user/editAddress',{data:getAddress[0].customer_address , index,notification})
            }
            else
            res.redirect('/profile')

    }
    catch(err)
    {
        console.log(err)
        res.redirect('/profile')
    }
}

// ---------------------------- Update existing address --------------------- 

const updateAddress= async (req,res)=>{
const id= req.session.user;
const index = parseInt(req.params.index, 10);
const data= {
    building:req.body.building,
    street:req.body.street,
    city:req.body.city,
    state:req.body.state,
    country:req.body.country,
    pincode:req.body.pincode,
    phonenumber:req.body.phonenumber,
    landmark:req.body.landmark
}

const validate = validation.addressValidation(data);
if (validate.status) {
    try {

        const updateQuery = {};
        updateQuery[`customer_address.${index}`] = data; // Constructing the dynamic update object

        const result = await clientCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateQuery }
        );

        if (result.modifiedCount > 0) {
            globalNotification = {
                status: 'success',
                message: "Address updated successfully"
            };
        }
        res.redirect('/profile');
    } catch (err) {
        globalNotification = {
            status: 'error',
            message: "Something went wrong. Try again"
        };
        res.redirect(`/edit-address/${index}`);
    }
}
    else
    {
        globalNotification={
            status:'error',
            message:validate.message
        }
        res.redirect(`/edit-address/${index}`)
    }
}

// ------------------------------------- Remove an address ------------------------------ 
const removeAddress = async (req,res)=>{
    const index = parseInt(req.params.index,10)
    const id= req.session.user
    try{
        const result = await clientCollection.updateOne(
            { _id: new ObjectId(id) },
            [
                {
                    $set: {
                        customer_address: {
                            $concatArrays: [
                                { $slice: ["$customer_address", index] },
                                { $slice: ["$customer_address", { $add: [index, 1] }, { $size: "$customer_address" }] }
                            ]
                        }
                    }
                }
            ]
        );
        globalNotification={
            status:'success',
            message:"Address removed Successfully"
        }
    }
    catch(err){
        globalNotification={
            status:'error',
            message:'something went wrong'
        }
        
    }
    res.redirect('/profile')
}

module.exports={
    showProfile,
    updateProfile,
    addAddress,
    editAddress,
    updateAddress,
    removeAddress
}