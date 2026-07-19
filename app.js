if(process.env.NODE_ENV!="production"){
  require('dotenv').config();
}
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const flash= require("connect-flash");
const session = require("express-session");
const MongoStore=require('connect-mongo');
const passport= require("passport");
const LocalStrategy= require("passport-local");
const User=require("./models/user.js");

const listingRouter=require("./routes/listing.js");
const reviewRouter =require("./routes/review.js");
const userRouter =require("./routes/user.js");

const dbUrl=process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch(err => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store= MongoStore.create({
  mongoUrl:dbUrl,
   touchAfter:24*3600,
});

store.on("error",(err)=>{
  console.log("ERROR in Mongo Session Store",err);
});

const sessionOptions={
  store,
  secret: process.env.SECRET,
  resave:false,
  saveUninitialized :true,
  cookie:{
    expires:Date.now()+7*24*60*60*1000,
    maxAge:7*24*60*60*1000,
    httpOnly:true
  }
};



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next();
});


app.get("/", (req, res) => {
  res.redirect("/listings");
});


app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);


const notFoundHandler = (req, res, next) => {
  res.status(404).send("Page not found");
};

app.use(notFoundHandler);



// Error handler middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", {
    message,
    currUser: req.user || null,
    success: typeof req.flash === "function" ? req.flash("success") : [],
    error: typeof req.flash === "function" ? req.flash("error") : [],
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});