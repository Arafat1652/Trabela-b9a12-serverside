const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const cors = require('cors')
const port = process.env.PORT || 5000;


// middlewares
app.use(express.json())
app.use(cors())




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

  

   // save a user data in db
   app.put('/user', async(req, res)=>{
    const user = req.body;
    const query = {email: user?.email}
    // check if user already exists in db
    const isExist = await userCollection.findOne({email: user?.email})
    if(isExist){
    return res.send(isExist)
    }

      // save user for the first time
    const options = {upsert: true}
    const updateDoc={
      $set:{
        ...user,
      }
    }
    const result = await userCollection.updateOne(query, updateDoc, options)
    res.send(result)
  })

  // get all guides from db
  app.get('/guides', async(req, res)=>{
    const result = await userCollection.find({role: "guide"}).toArray()
    res.send(result)
  })

  // get all tour type 
  app.get('/types', async(req, res) => {
    const result = await typeCollection.find().toArray()
    res.send(result)
})

 // find tour type wise package
 app.get("/types/:tour_type", async(req, res) => {
  console.log(req.params.tour_type);
  const result = await packageCollection.find({tour_type: req.params.tour_type }).toArray();
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