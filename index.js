require('dotenv').config();
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express()
const port = process.env.PORT || 3000

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection

        const productsCollection = client.db('galaxiDb').collection('productsCollection');

        const categoryCollection = client.db('galaxiDb').collection('categoryCollection');

        const ordersCollection = client.db('galaxiDb').collection('orderCollections');

        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            console.log(newProduct)
            const result = await productsCollection.insertOne(newProduct)
            res.send(result);
        })

        app.get('/categories', async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            let filter = {};
            const query = req.query.email;
            console.log(query);
            if (query) {
                filter = { email: query }
            }
            const products = await productsCollection.find(filter).toArray();
            console.log(products)
            res.send(products)
        })

        app.get('/product/:id', async (req, res) => {
            const idStr = req.params.id;
            console.log('idstr', idStr)
            const id = new ObjectId(idStr);
            console.log('id', id)
            const filter = { _id: id };
            console.log('filter', filter)
            const result = await productsCollection.findOne(filter);
            console.log(result);
            res.send(result);
        })

        app.get('/products/category/:id', async (req, res) => {
            const filter = req.params.id;
            console.log('filter =', filter)
            const query = { category: filter }
            console.log('qurey =', query);
            const products = await productsCollection.find(query).toArray()
            console.log(products);
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
                console.log('filter:', filter);

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


        app.delete('/products/delete/:id', async (req, res) => {
            const id = req.params.id;
            const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })


        // ordered products functions


        app.post('/ordered/products',async(req,res)=>{
            const {orderedProducts} = req.body;
            // console.log(orderedProducts);
            const result = await ordersCollection.insertOne(orderedProducts);
            res.send(result);
        })



        await client.db("admin").command({ ping: 1 });
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
