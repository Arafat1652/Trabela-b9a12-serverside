const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;


// const corsOptions = {
//   origin: [
//     'http://localhost:5173','https://travel-advisor-a12.web.app','https://travel-advisor-a12.firebaseapp.com'
//   ],
//   credentials: true,
//   optionSuccessStatus: 200,
// }

// middlewares
app.use(
    cors({
      origin: [
        'http://localhost:5173','https://travel-advisor-a12.web.app','https://travel-advisor-a12.firebaseapp.com'
      ],
      credentials: true,
    })
  );
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

  // get a user info by email from db
  app.get('/user/:email', async(req,res)=>{
    const email = req.params.email
    // console.log(email);
    const result = await userCollection.findOne({email: email})
    res.send(result)
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
  app.put('/user/:email', async(req, res) => {
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

  //  app.put('/user', async(req, res)=>{
  //   const user = req.body;
  //   const query = {email: user?.email}
  //   // check if user already exists in db
  //   const isExist = await userCollection.findOne({email: user?.email})
  //   if(isExist){
  //   return res.send(isExist)
  //   }

  //     // save user for the first time
  //   const options = {upsert: true}
  //   const updateDoc={
  //     $set:{
  //       ...user,
  //     }
  //   }
  //   const result = await userCollection.updateOne(query, updateDoc, options)
  //   res.send(result)
  // })

  

  // get all guides from db
  app.get('/guides', async(req, res)=>{
    const result = await userCollection.find({role: "guide"}).toArray()
    res.send(result)
  })
  app.get('/guides/:id', async(req, res)=>{
    const id = req.params.id
    const query = { _id: new ObjectId(id)};
    const result = await userCollection.findOne(query);
    res.send(result)
  })


  // get all tour type 
  app.get('/types', async(req, res) => {
    const result = await typeCollection.find().toArray()
    res.send(result)
})

 // find tour type wise package
 app.get("/types/:tour_type", async(req, res) => {
  // console.log(req.params.tour_type);
  const result = await packageCollection.find({tour_type: req.params.tour_type }).toArray();
  res.send(result)
})

   // get all storys type 
   app.get('/storys', async(req, res) => {
    const result = await storyCollection.find().toArray()
    res.send(result)
})

   // find a story by id for story details page
   app.get('/storys/:id', async(req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id)};
    const result = await storyCollection.findOne(query);
    res.send(result)
  })

  // for posting a story in story collection 
  app.post('/storys', async(req, res) => {
    const storyData = req.body
    const result = await storyCollection.insertOne(storyData)
    res.send(result)
})

    // save or post booking in the db
  app.post('/bookings', async(req, res) => {
    const bookData = req.body
    const result = await bookingCollection.insertOne(bookData)
    res.send(result)
})


  // geting bookings by user
  app.get('/my-bookings/:email', async(req,res)=>{
    const email = req.params.email
    // console.log(email);
    const result = await bookingCollection.find({tourist_email: email}).toArray()
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