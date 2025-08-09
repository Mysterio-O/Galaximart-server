require('dotenv').config();
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const admin = require("firebase-admin");
const serviceAccount = require("./galaxiamart-firebase-adminsdk.json");

const app = express()
const port = process.env.PORT || 3000

app.use(cors({
    origin: ['http://localhost:5173', 'https://galaxi-mart.netlify.app'],
    credentials: true
}));
app.use(express.json());

const client = new MongoClient(process.env.DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// firebase adminAdd commentMore actions

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const verifyFirebaseToken = async (req, res, next) => {
    const accessToken = req?.headers?.authorization;

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    const token = accessToken.split(' ')[1];
    // console.log(token);

    try {
        const decoded = await admin.auth().verifyIdToken(token)
        // console.log('decoded->', decoded);

        req.decoded = decoded;

        next();
    }
    catch (error) {
        res.status(401).send({ message: 'unauthorized access' });
    }

}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection

        // console.log('entered mongo function')

        const productsCollection = client.db('galaxiDb').collection('productsCollection');

        const categoryCollection = client.db('galaxiDb').collection('categoryCollection');

        const ordersCollection = client.db('galaxiDb').collection('orderCollections');

        const messageCollection = client.db('galaxiDb').collection('messageCollection');

        const cartCollection = client.db('galaxiDb').collection('cartCollection');

        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            // console.log(newProduct)
            const result = await productsCollection.insertOne(newProduct)
            res.send(result);
        })

        app.get('/categories', async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result);
        })

        app.get('/products', verifyFirebaseToken, async (req, res) => {

            // console.log('decoded from api->', req.decoded);

            let filter = {};
            const query = req.query.email;
            // console.log(query);
            if (query) {

                if (query !== req?.decoded?.email) {
                    return res.status(401).send({ message: 'Access denied' })
                }

                filter = { email: query }
            }

            const products = await productsCollection.find(filter).toArray();
            // console.log('products length->', products.length)
            res.send(products)
        })

        app.get('/allProducts', verifyFirebaseToken, async (req, res) => {
            const { sortParam } = req.query;
            let sortObj = {};
            let filter = {};
            if (sortParam) {
                const quantity = parseInt(sortParam);
                if (quantity === 50 || quantity === 100) {
                    filter = { minQuantity: { $gte: quantity } };
                    sortObj = { minQuantity: 1 }
                } else {
                    res.status(400).send({ message: 'Invalid Sort Param' })
                }
            }

            const result = await productsCollection.find(filter).sort(sortObj).toArray();
            res.send(result);

        })

        app.get('/product/:id', async (req, res) => {
            const idStr = req.params.id;
            // console.log('idstr', idStr)
            const id = new ObjectId(idStr);
            // console.log('id', id)
            const filter = { _id: id };
            // console.log('filter', filter)
            const result = await productsCollection.findOne(filter);
            // console.log(result);
            res.send(result);
        })

        app.get('/products/category/:id', async (req, res) => {
            const filter = req.params.id;
            // console.log('filter =', filter)
            const query = { category: filter }
            // console.log('qurey =', query);
            const products = await productsCollection.find(query).toArray()
            // console.log(products);
            res.send(products)
        })


        app.patch('/purchase/product/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { quantity } = req.body;
                // console.log('sold amount:', quantity);

                if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
                    return res.status(400).send({ error: 'Invalid quantity' });
                }

                const filter = { _id: new ObjectId(id) };
                // console.log('filter:', filter);

                const updatedQuantity = {
                    $inc: { stock: -quantity }
                };
                // console.log('updated quantity:', updatedQuantity);

                const result = await productsCollection.updateOne(filter, updatedQuantity);
                // console.log('update result:', result);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ error: 'Product not found' });
                }

                res.send({ message: 'Stock updated successfully', result });
            } catch (error) {
                console.error('Error updating stock:', error);
                res.status(500).send({ error: 'Server error' });
            }
        });


        app.patch('/update/product/:id', async (req, res) => {
            const { id } = req.params;
            const { updatedProduct } = req.body;
            const filter = { _id: new ObjectId(id) };

            // console.log('updated product->',updatedProduct)

            const updatedDoc = { $set: updatedProduct }

            const result = await productsCollection.updateOne(filter, updatedDoc);

            // console.log('from product update->', id, updatedProduct, result);

            res.send(result);
        })


        app.delete('/products/delete/:id', async (req, res) => {
            const id = req.params.id;
            const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })


        // ordered products functions


        app.post('/ordered/products', async (req, res) => {
            const { orderedProducts } = req.body;
            // console.log(orderedProducts);
            const result = await ordersCollection.insertOne(orderedProducts);
            res.send(result);
        })

        app.get('/ordered/products', verifyFirebaseToken, async (req, res) => {
            const query = req.query.email;
            // console.log(query);

            if (query) {
                if (query !== req?.decoded?.email) {
                    return res.status(403).send({ message: 'Access Denied' })
                }
            }

            const filter = { email: query };
            const result = await ordersCollection.find(filter).toArray();
            // console.log(result);
            res.send(result)
        })

        app.delete('/ordered/product/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/ordered/products/:id', async (req, res) => {
            const { quantity } = req.body;
            try {
                if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
                    return res.status(400).send('Invalid Quantity')
                }

                const { id } = req.params;
                const filter = { name: id };

                const updatedQuantity = {
                    $inc: { stock: quantity }
                }


                const result = await productsCollection.updateOne(filter, updatedQuantity);

                // console.log('from patch->', quantity, id, updatedQuantity, result);


                if (result.matchedCount === 0 || result.modifiedCount === 0) {
                    return res.status(404).send({ error: 'Product not found' });
                }

                res.send({ message: 'Stock updated successfully', result });
            } catch (error) {
                console.error('Error updating stock:', error);
                res.status(500).send({ error: 'Server error' });
            }
        });



        // message api
        app.post('/send-message', async (req, res) => {
            const messageBody = req.body;
            console.log(messageBody);

            if (!messageBody) {
                return res.status(400).json({ message: "message not found" });
            }

            try {
                const result = await messageCollection.insertOne(messageBody);

                if (!result.insertedId) {
                    return res.status(404).json({ message: "message not sent! try again." })
                };

                res.status(201).json({ message: "message sent" });
            }
            catch (err) {
                console.log('error posting new message', err);
                res.status(500).json({ message: "internal server error while posting new message" });
            }
        });


        // cart api
        app.post('/add-to-cart', verifyFirebaseToken, async (req, res) => {
            const cartItems = req.body;
            if (!cartItems) {
                return res.status(400).json({ message: 'cart not found!' });
            }
            try {
                const result = await cartCollection.insertOne(cartItems);
                if (!result.insertedId) {
                    return res.status(404).json({ message: "cart not added. try again" });
                }
                res.status(201).json({ message: 'item added to your cart.', result });
            }
            catch (err) {
                console.log('error adding items in the card', err);
                res.status(500).json({ message: "internal server error adding items to the cart." });
            }
        });

        app.get('/cart-items', async (req, res) => {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({ message: 'user email not found!' });
            }

            try {
                const sortQuery = { user: email };
                const cartItems = await cartCollection.find(sortQuery).toArray();
                if (!cartItems) {
                    return res.status(404).json({ message: "no item found in the cart." });
                }
                else{
                    
                }
                res.status(200).json(cartItems);
            }
            catch (err) {
                console.log('error getting cart items.', err);
                res.status(500).json({ message: "internal server error getting cart items" });
            }

        })


        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
