const express = require('express')
const cors = require('cors')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;


const corsOptions = {
  origin: [
    'http://localhost:5173','https://travel-advisor-a12.web.app','https://travel-advisor-a12.firebaseapp.com'
  ],
  credentials: true,
  optionSuccessStatus: 200,
}

// middlewares

// app.use(
//     cors({
//       origin: [
//         'http://localhost:5173','https://travel-advisor-a12.web.app','https://travel-advisor-a12.firebaseapp.com'
//       ],
//       credentials: true,
//     })
//   );

app.use(cors(corsOptions));
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9jgyd7l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// console.log(uri);


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const packageCollection = client.db('travelDB').collection('packages')
    const userCollection = client.db('travelDB').collection('users')
    const typeCollection = client.db('travelDB').collection('types')
    const storyCollection = client.db('travelDB').collection('storys')
    const bookingCollection = client.db('travelDB').collection('bookings')
    const wishListCollection = client.db('travelDB').collection('wishLists')
    const commentsCollection = client.db('travelDB').collection('comments')

    // jwt
    app.post('/jwt', async(req, res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d'
      })
      res.send({token})
    })

    // middlewares 
    const verifyToken =(req, res, next)=>{
      // console.log('inside verify token' ,req.headers.authoraization);
      if(!req.headers.authoraization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authoraization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next()
      })
    }

     // use verifyAdmin after verifytoken
     const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email
      const query = {email: email}
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
       return res.status(403).send({message: 'forbiden access'})
      }
      next()
    }


    // verify host middleware
    const verifyGuide = async (req, res, next) => {
      console.log('hello')
      const user = req.decoded
      const query = { email: user?.email }
      const result = await userCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'guide') {
        return res.status(401).send({ message: 'unauthorized access!!' })
      }

      next()
    }


    // get all package from package collection
    app.get('/packages', async(req, res)=>{
        const result = await packageCollection.find().toArray()
        res.send(result)
    })

     // find a package by id for Package details page
  app.get('/packages/:id', async(req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id)};
    const result = await packageCollection.findOne(query);
    res.send(result)
  })

   // add package in package collection-->tour package
   app.post('/packages',verifyToken, verifyAdmin, async(req, res) => {
    const packageData = req.body
    const result = await packageCollection.insertOne(packageData)
    res.send(result)
})

  // get a user info by email from db
  app.get('/user/:email',verifyToken, async(req,res)=>{
    const email = req.params.email
    // console.log(email);
    const result = await userCollection.findOne({email: email})
    res.send(result)
  })

  // get all users data from db for manage users
  app.get('/users',verifyToken, verifyAdmin, async(req, res) => {
    const size = parseInt(req.query.size)
    const page = parseInt(req.query.page) - 1
    // console.log(size, page)
    const search = req.query.search
    const filter = req.query.filter
    // console.log('filter',filter);

    
    
      const searchType = req.query.searchType || 'name'; 
      // console.log(searchType, search);

      let query = {};
      if (filter) query.role = filter

      if (searchType === 'name') {
        query.name = { $regex: search, $options: 'i' };
    } else if (searchType === 'email') {
        query.email = { $regex: search, $options: 'i' };
    }
    // const totalCount = await userCollection.countDocuments();
    const result = await userCollection.find(query).skip(page * size).limit(size).toArray()
     res.send(result);
  })

  // for users coutn
  app.get('/userCount',verifyToken, verifyAdmin, async(req, res)=> {
    const search = req.query.search
    const filter = req.query.filter
    const searchType = req.query.searchType || 'name'; 
    // console.log(searchType, search);

    let query = {};
    if (filter) query.role = filter

    if (searchType === 'name') {
      query.name = { $regex: search, $options: 'i' };
  } else if (searchType === 'email') {
      query.email = { $regex: search, $options: 'i' };
  }
    
    const count = await userCollection.countDocuments(query)
    res.send({count})
  })

   // save a user data in db
   app.post('/user', async(req, res)=>{
    const user = req.body;
    
    const query = {email: user?.email}
    const isExist = await userCollection.findOne(query)
    if(isExist){
      return res.send({message: 'user already exists', insertedId: null})
    }
    const result = await userCollection.insertOne(user)
    res.send(result)
  })

  // for posting guide infos in guideInfos Collection
  app.put('/user/:email',verifyToken, async(req, res) => {
    const guideInfo = req.body;
    const query = {email: guideInfo?.email}
    const options = {upsert: true}
    const updateDoc={
      $set:{
        ...guideInfo,
      }
    }
    const result = await userCollection.updateOne(query, updateDoc, options)
    res.send(result)
})
  // update user status from tourist menu
  app.put('/userStatus/:email', async(req, res) => {
    const currentUser = req.body;
    const query = {email: currentUser?.email}
    // console.log(currentUser);
    const options={upsert: true}
    const updateDoc={
      $set:{ status: currentUser?.status }
    }
    const result = await userCollection.updateOne(query, updateDoc, options)
    res.send(result)
})

// update role in user collection
app.patch('/users/admin/:email', async(req, res)=>{
  const email = req.params.email;
  const userRole = req.body.role;
  const query = { email };

  // Fetch the current user from the database
  const user = await userCollection.findOne(query);

  // Check if the role is the same
  if (user && user.role === userRole) {
    // If the role is the same, skip the update and send a response
    return res.send({ message: "🙏Role is already the same", modifiedCount: 0 });
  }

  // Proceed with the update if the roles are different
  const updateDoc = {
    $set: {
      role: userRole,
      status: req.body.status,
    },
  };

  const result = await userCollection.updateOne(query, updateDoc);
  res.send(result);
})

  // get all guides from db--> users(pagination update)
  app.get('/guides', async(req, res)=>{
      // console.log(email);
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      // console.log(size, page)
    const result = await userCollection.find({role: "guide"}).skip(page * size).limit(size).toArray()
    res.send(result)
  })

    // meet our tour guide (pagination count)
    app.get('/guideCount', async(req, res)=> {
      const count = await userCollection.countDocuments({role: "guide"})
      res.send({count})
    })

  // get guides by his id
  app.get('/guides/:id', async(req, res)=>{
    const id = req.params.id
    const query = { _id: new ObjectId(id)};
    const result = await userCollection.findOne(query);
    res.send(result)
  })

  // chekeing requested or not for guide status
  app.get('/check-requested/:email', async(req, res) => {
    const email = req.params.email
    console.log(email);
    
    const query = { email: email};
    const result = await userCollection.findOne(query);  
    res.send({status: result.status})
  })


  // get all tour type --> types
  app.get('/types', async(req, res) => {
    const result = await typeCollection.find().toArray()
    res.send(result)
})

 // find tour type wise package--> types
 app.get("/types/:tour_type", async(req, res) => {
  // console.log(req.params.tour_type);
  const result = await packageCollection.find({tour_type: req.params.tour_type }).toArray();
  res.send(result)
})

   // get all storys type -->storys
   app.get('/storys', async(req, res) => {
    const result = await storyCollection.find().toArray()
    res.send(result)
})

   // find a story by id for story details page-->storys
   app.get('/storys/:id', async(req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id)};
    const result = await storyCollection.findOne(query);
    res.send(result)
  })

  // for posting a story in story collection-->storys
  app.post('/storys', async(req, res) => {
    const storyData = req.body
    const result = await storyCollection.insertOne(storyData)
    res.send(result)
})

    // save or post booking in the db-->  bookings
  app.post('/bookings', async(req, res) => {
    const bookData = req.body
    const result = await bookingCollection.insertOne(bookData)
    res.send(result)
})

  // geting bookings by user-->  bookings(pagination added)
  app.get('/my-bookings/:email',verifyToken, async(req,res)=>{
    const email = req.params.email
    // console.log(email);
    const size = parseInt(req.query.size)
    const page = parseInt(req.query.page) - 1
    // console.log(size, page)
    const result = await bookingCollection.find({tourist_email: email}).skip(page * size).limit(size).toArray()
    res.send(result)
  })

   // in my bookings page this is (pagination count)
   app.get('/bookingCount/:email',verifyToken, async(req, res)=> {
    const email = req.params.email
    const count = await bookingCollection.countDocuments({tourist_email: email})
    res.send({count})
  })

  // for more then 3 booking challange part
  app.get('/counted-booking/:email', async (req, res) => {
    const email = req.params.email;
        const count = await bookingCollection.countDocuments({ tourist_email: email });
        res.send({ count });
});

  // getting booking price for payment
  app.get('/payment/:id', async(req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id)};
    const result = await bookingCollection.findOne(query);  
    res.send({price: result.price})
  })

  // payment intent 
  app.post('/create-payment-intent', async(req, res)=>{
    const {price} = req.body;
    const amount = parseInt(price * 100)
    // console.log('inside the intent', amount);
    

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types:["card"]
    })
    
    res.send({
      clientSecret: paymentIntent.client_secret,
    })

  })


  // cancel a bookings from my bookings list -- tourist
  app.delete('/cancelbook/:id', async(req, res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await bookingCollection.deleteOne(query)
    res.send(result)
  })

  // for guide getting my assing tour--> bookings(pagination added)
  app.get('/my-assignTour/:name',verifyToken,verifyGuide, async(req,res)=>{
    const name = req.params.name
    const size = parseInt(req.query.size)
    const page = parseInt(req.query.page) - 1
    // console.log(size, page)
    // console.log(name);
    const result = await bookingCollection.find({guide_name: name}).skip(page * size).limit(size).toArray()
    res.send(result)
  })

  // in assign tour tourCount for pagination my-assignTour
  
  app.get('/tourCount/:name',verifyToken,verifyGuide, async(req, res)=> {
    const name = req.params.name
    const count = await bookingCollection.countDocuments({guide_name: name})
    res.send({count})
  })


  // for guide update the tour status accept or reject
  app.patch('/tourAccepted/:id', async(req, res)=>{
    const id = req.params.id;
    const accept = req.body
    const filter = {_id: new ObjectId(id)};
    const updateDoc = {
      $set: {
        status: accept.status
      },
    };
    const result = await bookingCollection.updateOne(filter, updateDoc)
    res.send(result)
  })

    // save to wishLists collection-->  wishLists
    app.post('/wishLists', async(req, res) => {
      const wishData = req.body

      // cheking same user and same package is exist?
        const existingWish = await wishListCollection.findOne({
            email: wishData.email,
            package_name: wishData.package_name
        });

        if (existingWish) {
            // if it exist
            return res.status(400).send({ message: 'this item is already exist in your wish list' });
        }
        // then add in wishlist collection
        const result = await wishListCollection.insertOne(wishData);
        res.send(result);
    
  })

   // for guide getting my assing tour--> bookings
   app.get('/my-wishlist/:email', async(req,res)=>{
    const email = req.params.email
    const size = parseInt(req.query.size)
    const page = parseInt(req.query.page) - 1
    // console.log(size, page)
    const result = await wishListCollection.find({email: email}).skip(page * size).limit(size).toArray()
    res.send(result)
  })

   // in my wishlist page this is (pagination count)
   app.get('/wishCount/:email', async(req, res)=> {
    const email = req.params.email
    const count = await wishListCollection.countDocuments({email: email})
    res.send({count})
  })

  // delete wishlist item form my wishlist
  app.delete('/wishList/:id', async(req, res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await wishListCollection.deleteOne(query)
    res.send(result)
  })

   // get comment data for ui
   app.get('/comments/:email', async(req,res)=>{
    const email = req.params.email
    // console.log(name);
    const result = await commentsCollection.find({email: email}).toArray()
    res.send(result)
  })

    // save a comment for guide in db
    app.post('/comments', async(req, res) => {
      const commentsData = req.body
      const result = await commentsCollection.insertOne(commentsData)
      res.send(result)
  })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('trip advisor is in server')
})

app.listen(port, ()=>{
    console.log(`trip advisor is running on port ${port}`);
})