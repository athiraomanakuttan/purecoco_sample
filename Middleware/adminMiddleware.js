const adminSessionCheck = (req,res,next)=>{
    console.log("admin session active");
    if(req.session.adminEmail)
        {
           
            next();
        }
        else{
            res.redirect('/admin/')
        }
}

const adminLoginCheck =(req,res,next)=>{
    if(req.session.adminEmail)
    {
            res.redirect('/admin/dashboard')
    }
    else
    {
        next();
    }
}

module.exports= { adminSessionCheck , adminLoginCheck}