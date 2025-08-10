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
    // console.log("entered verification")
    // console.log(accessToken);

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

        const confirmedOrderCollection = client.db('galaxiDb').collection('confirmedOrderCollection');

        const subscribers = client.db('galaxiDb').collection('subscriberCollection');

        app.post('/products',verifyFirebaseToken, async (req, res) => {
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
            const { sortParam, page = 1, limit = 10 } = req.query;

            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);

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

            try {
                const total = await productsCollection.countDocuments(filter);

                const skip = (pageNumber - 1) * limitNumber

                const result = await productsCollection.find(filter)
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limitNumber)
                    .toArray();

                res.status(200).json({
                    data: result,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: limitNumber,
                        totalPages: Math.ceil(total / limitNumber),
                        hasNextPage: pageNumber * limitNumber < total,
                        hasPrevPage: pageNumber > 1
                    }
                });

            }
            catch (err) {
                console.error("error getting all products", err);
                res.status(500).json({ message: "internal server error getting all products" });
            }


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
            try {
                const filter = req.params.id;
                const { page = 1, limit = 10 } = req.query;

                const pageNumber = parseInt(page);
                const limitNumber = parseInt(limit);

                const query = { category: filter }
                // console.log(query);

                const total = await productsCollection.countDocuments(query);
                const skip = (pageNumber - 1) * limitNumber;

                const products = await productsCollection.find(query)
                    .skip(skip)
                    .limit(limitNumber)
                    .toArray()
                // console.log('products from category products',products);
                res.status(200).json({
                    data: products,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: limitNumber,
                        totalPages: Math.ceil(total / limitNumber),
                        hasNextPage: page * limitNumber < total,
                        hasPrevPage: page > 1
                    }
                })
            }
            catch (err) {
                console.error("error getting products", err);
                res.status(500).json({ message: "internal server error getting category products" });
            }
        })


        app.patch('/purchase/product/:id',verifyFirebaseToken, async (req, res) => {
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


        app.patch('/update/product/:id',verifyFirebaseToken, async (req, res) => {
            const { id } = req.params;
            const { updatedProduct } = req.body;
            const filter = { _id: new ObjectId(id) };

            // console.log('updated product->',updatedProduct)

            const updatedDoc = { $set: updatedProduct }

            const result = await productsCollection.updateOne(filter, updatedDoc);

            // console.log('from product update->', id, updatedProduct, result);

            res.send(result);
        })


        app.delete('/products/delete/:id',verifyFirebaseToken, async (req, res) => {
            const id = req.params.id;
            const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })


        // ordered products functions


        app.post('/ordered/products',verifyFirebaseToken, async (req, res) => {
            const { orderedProducts } = req.body;
            // console.log(orderedProducts);
            const result = await ordersCollection.insertOne(orderedProducts);
            res.send(result);
        })

        app.get('/ordered/products', verifyFirebaseToken, async (req, res) => {
            const query = req.query.email;
            // console.log(query);

            // if (query) {
            //     if (query !== req?.decoded?.email) {
            //         return res.status(403).send({ message: 'Access Denied' })
            //     }
            // }

            const filter = { email: query };
            const result = await ordersCollection.find(filter).toArray();
            // console.log(result);
            res.send(result)
        })

        app.delete('/ordered/product/:id',verifyFirebaseToken, async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/ordered/products/:id',verifyFirebaseToken, async (req, res) => {
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
        app.post('/add-to-cart',verifyFirebaseToken, async (req, res) => {
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

        app.get('/cart-items',verifyFirebaseToken, async (req, res) => {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({ message: 'user email not found!' });
            }

            try {
                const sortQuery = { user: email };
                const cartItems = await cartCollection.find(sortQuery).toArray();
                // console.log('cart items from get request ->', cartItems);
                if (!cartItems) {
                    return res.status(404).json({ message: "no item found in the cart." });
                }
                else {
                    res.status(200).json(cartItems);
                }

            }
            catch (err) {
                console.log('error getting cart items.', err);
                res.status(500).json({ message: "internal server error getting cart items" });
            }

        });

        app.post('/cart-item-details-by-id',verifyFirebaseToken, async (req, res) => {
            const { ids } = req.body;
            console.log('ids from carte items by id->', ids);

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "ids not found or invalid" });
            }

            try {
                const filter = {
                    _id: {
                        $in: ids.map(id => new ObjectId(id))
                    }
                }
                console.log('filter form the cart item details api->', filter);
                const products = await productsCollection.find(filter).toArray();
                console.log('products from cart item details by id->', products);
                res.status(200).json(products);
            }
            catch (err) {
                console.error("error getting cart items with id", err);
                res.status(500).json({ message: "internal server error fetching cart items with id" });
            }

        });

        app.patch('/cart-items/:id',verifyFirebaseToken, async (req, res) => {
            const { id } = req.params;
            const { quantity } = req.body;
            console.log("id and quantity from cart quantity patch",
                {
                    id, quantity
                }
            )
            if (!quantity) {
                return res.status(400).json({ message: "quantity not found" });
            }
            if (!id) {
                return res.status(400).json({ message: "product id not found" });
            }
            try {
                const updatedDoc = {
                    $set: { quantity }
                }
                const result = await cartCollection.updateOne({
                    _id: new ObjectId(id)
                }, updatedDoc);
                console.log('result from cart quantity update', result);
                res.status(201).json({ result });
            }
            catch (err) {
                console.error("internal server error patching cart item quantity", err);
                res.status(500).json({ message: "internal server error patching cart item quantity" })
            }
        });

        app.delete('/cart-items/:id',verifyFirebaseToken, async (req, res) => {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ message: "product id not found!" });
            }
            try {
                const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount < 1) {
                    return res.status(400).json({ message: 'failed to delete cart item' });
                } else {
                    console.log('cart item deleted', result);
                    res.status(201).json(result);
                }
            }
            catch (err) {
                console.error('internal server error deleting cart item', err);
                res.status(500).json({ message: 'internal server error deleting cart item' });
            }
        });

        app.delete('/delete-all-cart-items',verifyFirebaseToken, async (req, res) => {
            const { email } = req.query;
            console.log(email);
            if (!email) {
                return res.status(400).json({ message: "user email not found!" });
            }
            try {
                const result = await cartCollection.deleteMany({ user: email });
                if (result?.deletedCount > 0) {
                    res.status(201).json(result);
                } else {
                    return res.status(400).json({ message: "failed to delete cart items" });
                }
            }
            catch (err) {
                console.error("error cleaning cart items", err);
                res.status(500).json({ message: "internal server error deleting cart items" });
            }
        })


        // confirm order collection from cart 
        app.post('/create-confirm-order',verifyFirebaseToken, async (req, res) => {
            const orderBody = req.body;
            // console.log(orderBody);
            if (!orderBody) {
                return res.status(400).json({ message: 'order details not found!' });
            }

            try {
                const result = await confirmedOrderCollection.insertOne(orderBody);
                if (result?.insertedId) {
                    res.status(201).json(result);
                } else {
                    return res.status(400).json({ message: "placing order was unsuccessful!" });
                }
            }
            catch (err) {
                console.error("internal server error adding confirm order in the database", err);
                res.status(500).json({ message: "internal server error adding confirm order in the database" });
            }

        });

        app.get('/my-ordered-items',verifyFirebaseToken, async (req, res) => {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ message: "user email not found!" });
            }

            try {
                const result = await confirmedOrderCollection.find({
                    'purchaseDetails.userEmail': email
                }).sort({
                    'purchaseDetails.orderedDate': -1
                }).toArray();

                if (!result) {
                    return res.status(404).json({ message: "no order history found with this email" });
                }
                res.status(200).json(result);

            }
            catch (err) {
                console.error("error getting users confirmed orders", err);
                res.status(500).json({ message: "internal server error getting confirmed orders!" });
            }

        });

        app.delete('/delete-my-orders',verifyFirebaseToken, async (req, res) => {
            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ message: "order id not found" });
            }
            try {
                const result = await confirmedOrderCollection.deleteOne({
                    _id: new ObjectId(id)
                });
                if (result?.deletedCount < 1) {
                    return res.status(400).json({ message: "order delete failed" });
                }
                else {
                    res.status(201).json(result);
                }
            }
            catch (err) {
                console.error("error deleting ordered item", err);
                res.status(500).json({ message: "internal server error deleting confirmed order" });
            }
        });

        // track order
        app.get('/track-order',verifyFirebaseToken, async (req, res) => {
            const { transactionId, email } = req.query;
            if (!transactionId || !email) {
                return res.status(400).json({ message: "transaction id or email missing" });
            }
            try {
                const filter = { 'purchaseDetails.transactionId': transactionId }
                const result = await confirmedOrderCollection.findOne(filter);
                if (!result) {
                    return res.status(404).json({ message: "order not found" });
                }
                res.status(200).json(result);
            }
            catch (err) {
                console.error("error tracking order", err);
                res.status(500).json({ message: "internal server error tracking order" });
            }
        });

        // subscriber
        app.post('/subscribe', async (req, res) => {
            const { email } = req.body;
            // console.log(email);;
            if (!email) {
                return res.status(400).json({ message: "email not found" });
            }
            try {

                const existingSubscriber = await subscribers.findOne({ subscriber: email });

                if (existingSubscriber) {
                    return res.status(409).json({
                        message: "This email is already subscribed",
                        alreadySubscribed: true
                    });
                }

                const result = await subscribers.insertOne({ subscriber: email });
                if (!result.insertedId) {
                    return res.status(400).json({ message: "subscribing failed" });
                }
                res.status(201).json(result);
            }
            catch (err) {
                console.error("error adding subscriber");
                res.status(500).json({ message: "internal server error while subscribing" });
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
