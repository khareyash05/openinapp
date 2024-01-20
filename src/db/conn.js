const mongoose = require("mongoose")
const dotenv = require("dotenv")
require('dotenv').config()

const DB = process.env.DB

mongoose.connect(DB,{
    useNewUrlParser : true,
    useUnifiedTopology : true,
    useCreateIndex : true,
    useFindAndModify : false
}).then(()=>{
    console.log("Connected to database");
}).catch((err)=>{console.log(err);})