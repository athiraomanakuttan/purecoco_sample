const express = require("express");
const nocache = require("nocache");
const session = require("express-session");
const morgan = require("morgan");
const app = express();
const adminRouter = require("./Router/adminRouter");
const userRouter = require("./Router/userRouter");
const path = require("path");
const flash = require('connect-flash')
const passport = require('./Service/googleAuth');

// ------------------------ PORT Configuration -------------------------
const port = process.env.PORT;

const day = 1000 * 60 * 60 * 24;

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(nocache());
app.use(morgan("dev"));

// ------------------------- Session Configuration ----------------- 
app.use(session({
  secret: "secret-Key",
  resave: false,
  cookie: { maxAge: day },
  saveUninitialized: false,
}));
app.use(flash())

// ------------------------ Google authentication Configuration -------------------- 
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

// -------------- re-routing  --------
app.use("/", userRouter);                             
app.use("/admin", adminRouter);
app.use("*",(req,res)=>res.render('./layout/page-not-found'))              

app.listen(port, () => console.log(` server listening on port http://localhost:${port}`));
