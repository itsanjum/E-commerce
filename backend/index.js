const port=4000;
const express=require("express");
const app =express();
const mongoose=require("mongoose");
const jwt = require("jsonwebtoken");
const multer=require("multer");
const path=require("path");
const cors=require("cors");
const { type } = require("os");
const { log, error } = require("console");


app.use(express.json());
app.use(cors());


//Database Connection with MongoDB
mongoose.connect("mongodb+srv://anjumunnisa1999:Mannat123@cluster0.ryuqk.mongodb.net/e-commerce")


//API creation
app.get("/",(req,res)=>{
    res.send("Express App is running")

})

//Image Storage Engine
const storage =multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }

})


const upload=multer({storage:storage})



//Creating upload Endpoint for images
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`

    })
})

//Schema for creating products
const Product =mongoose.model("Product",{
    id:{
            type :Number,
            require:true,

    },
    name:{
            type:String,
            require :true,
            
    },
    image:{
            type:String,
            require :true,
    },
    category:{
            type:String,
            require :true,
    },
    new_price:{
        type :Number,
        require:true,

    },
    old_price:{
        type :Number,
        require:true,
    },
    date:{
        type: Date,
        default:Date.now,
    },
    available:{
            type:Boolean,
            default:true,
    }
    

})

//Endpoint
app.post('/addproduct',async (req,res)=>{
    let products =await Product.find({});
    let id;  //here id will be 1 increment of the previous id <-automatic id generation
    if(products.length>0)
    {
        let last_product_array =products.slice(-1);
        let last_product =last_product_array[0];
        id=last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
        date:req.body.date,
        available:req.body.available,
        
    });
    console.log(product);
    //save the data in database ,we use await
    await product.save();
    console.log("Saved");
//To generate the response on frontend 
    res.json({
        success:true,
        name:req.body.name,
    })

})

//creating API for deleting Products
app.post('/removeproduct',async (req,res) =>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    //Adding new response for Frontend
    res.json({
        success:true,
        name:req.body.name
    })
    
})

//creating API for getting all products

app.get('/allproducts',async (req,res) =>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
    
})


//Schema creating for user model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    data:{
        type:Date,
        default:Date.now,

    }
})

//Creating Endpoint for registering the user
app.post('/signup',async(req,res)=>{
    let check=await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email address"})
    }
    let cart ={};
    for (let i= 0; i < 300; i++) {
            cart[i]=0;

    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,

    })
    await user.save();


  const data = {
    user:{
        id:user.id
    }
  }

  const token = jwt.sign(data,'secret_ecom');
  res.json({success:true,token})

})


// creating Endpoint for user login

app.post('/login',async(req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user :{
                    id :user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});

        }
        else{
            res.json({success:false,errors:"Wrong Password"})
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"})
    }


})

//creating Endpoint for newcollection data

app.get('/newcollections',async (req,res)=>{
    let products =await Product.find({});
    let newcollection =products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);

    
})

//creating Endpoint for popular in women section

app.get('/popularinwomen',async (req,res)=>{
    let products =await Product.find({category:"women"})
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
    

})


//creating middleware to fetch user
 const fetchUser  = async (req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data =jwt.verify(token,'secret_ecom');
            req.user=data.user;
            next();


        } catch (error) {
                res.status(401).send({errors : "please authenticate using a valid token"})
            
        }
    }

 }

//creating Endpoint for adding products in cartdata
app.post('/addtocart',fetchUser, async(req,res)=>{
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

//creating Endpoint to remove product in cartdata

app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")

})

//creating Endpoint to get cartdata
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);


})

app.listen(port,(error)=>{
    if(!error){
        console.log("Server running on Port " +port)
    }
    else{
        console.log("Error : "+error)
    }
})


