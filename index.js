const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;

// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const serviceAccount = require("./scic-team-project-firebase-adminsdk");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hqjnl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

//console.log("uri", uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    console.log("DB connected Successfully");
    const database = client.db("team-test");
    const productsCollection = database.collection("products");
    const ordersCollection = database.collection("orders");
    const usersCollection = database.collection("users");

    //? ++++++++++++++++ Products +++++++++++++++

    //* Products GET API
    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find({});
      console.log(cursor);
      const products = await cursor.toArray();
      res.json(products);
    });

    //* Products POST API
    app.post("/products", async (req, res) => {
      const products = req.body;
      const result = await productsCollection.insertOne(products);
      console.log(result);
      res.json(result);
    });

    //* Products Delete API
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      console.log("Deleting id: ", result);
      res.json(result);
    });

    //? ++++++++++++++++ Single Orders +++++++++++++++

    //* Orders POST API
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      console.log(result);
      res.json(result);
    });

    //* Orders Single User GET API
    app.get("/orders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = ordersCollection.find(query);
      const userOrder = await user.toArray();
      res.json(userOrder);
    });

    //* Orders Delete API
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      console.log("result: ", result);
      res.json(result);
    });

    //* Orders PUT API
    app.put("/updateOrders/:id", async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body.status;
      const filter = { _id: ObjectId(id) };
      console.log(updatedStatus);
      const updateDoc = { $set: { status: updatedStatus } };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    //* All Orders Get API
    app.get("/orders", async (req, res) => {
      const cursor = ordersCollection.find({});
      console.log(cursor);
      const orders = await cursor.toArray();
      res.json(orders);
    });

    //? ++++++++++++++++ Users +++++++++++++++

    //* All Users Get API
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find({});
      console.log(cursor);
      const users = await cursor.toArray();
      res.json(users);
    });

    //* Users POST API
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    //* Users Info PUT API
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    //* Users Review PUT API
    app.put("/users/review", async (req, res) => {
      const review = req.body.star;
      const message = req.body.message;
      const email = req.body.email;
      const filter = { email: email };
      const updateDoc = { $set: { star: review, comment: message } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      console.log("review added", result);
      res.json(result);
    });

    //? ++++++++++++++++ Admin +++++++++++++++

    //* Admin PUT API
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          console.log("verified admin role added");
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "You don't have access to make admin" });
      }
    });

    //* Admin GET API
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Team test Server Connected");
});

app.listen(port, () => {
  console.log("Running port ", port);
});
