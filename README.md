# 🌌 GalaxiMart Backend

This is the backend server for the **GalaxiMart** e-commerce application, built with **Node.js**, **Express**, **MongoDB**, and **Firebase Authentication**. The server handles **product management**, **category retrieval**, and **order processing**, with secure endpoints protected by **Firebase token verification**.

---

## 📑 Table of Contents

- [🌟 Technologies Used](#-technologies-used)  
- [🧰 Prerequisites](#-prerequisites)  
- [⚙️ Installation](#️-installation)  
- [🔐 Environment Variables](#-environment-variables)  
- [📡 API Endpoints](#-api-endpoints)  
  - [📦 Products](#-products)  
  - [📂 Categories](#-categories)  
  - [🛒 Orders](#-orders)  
- [🚀 Running the Server](#-running-the-server)  
- [📝 License](#-license)

---

## 🌟 Technologies Used

- **Node.js**: JavaScript runtime for server-side development.  
- **Express**: Web framework for building RESTful APIs.  
- **MongoDB**: NoSQL database for storing products, categories, and orders.  
- **Firebase Admin SDK**: For verifying user authentication tokens.  
- **CORS**: Middleware for enabling cross-origin requests.

---

## 🧰 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)  
- **npm** (Node Package Manager)  
- A **MongoDB Atlas account** or a local MongoDB server  
- A **Firebase project** with Admin SDK credentials (serviceAccountKey)

---

## ⚙️ Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Mysterio-O/Galaximart-server.git
   cd ->(file name)
   ```
2. Install dependencies:

   ```bash
   npm i
   ```
3. Set up Firebase Admin SDK:
Download the Firebase Admin SDK JSON file (galaxiamart-firebase-adminsdk.json) from your Firebase project. Place it in the project root directory.

4. Configure environment variables (see Environment Variables).

## 🔐 Environment Variables

Create a `.env` file in the project root and add the following variables:

```env
PORT=3000
DB_URI=<your-mongodb-connection-string>
```

## 🔌 API Endpoints

---

### 📦 `POST /products`

**📝 Description:**  
Creates a new product in the database.

**📥 Request Body:**  
Send a JSON object with the following product details:

```json
{
  "name": "Laptop",
  "price": 999.99,
  "stock": 50,
  "category": "Electronics",
  "email": "user@example.com"
}
```
---

### `GET /products`

- **Description**: Retrieves products for the authenticated user, filtered by email (optional).
- **Headers**:  
  `Authorization: Bearer <firebase-token>`
- **Query Parameters**:  
  `email` (optional) — filters products by user email.
- **Response**: Array of products matching the filter.
- **Access**: Requires Firebase token.  
  Returns `401` if token is invalid or `403` if email doesn't match the token.

**Example**:  
`GET /products?email=user@example.com`

---

### `GET /allProducts`

- **Description**: Retrieves all products, optionally filtered by minimum quantity and sorted by `minQuantity`.
- **Headers**:  
  `Authorization: Bearer <firebase-token>`
- **Query Parameters**:  
  `sortParam` (optional) — accepts `50` or `100` to filter products with stock >= specified quantity.
- **Response**: Array of products, sorted by `minQuantity` if applicable.
- **Access**: Requires Firebase token.  
  Returns `400` for invalid `sortParam`.

**Example**:  
`GET /allProducts?sortParam=50`

---

### `GET /product/:id`

- **Description**: Retrieves a single product by its MongoDB ObjectId.
- **Headers**:  
  `Authorization: Bearer <firebase-token>`
- **Path Parameters**:  
  `id` — MongoDB ObjectId of the product.
- **Response**: Product object or `null` if not found.
- **Access**: Requires Firebase token.

**Example**:  
`GET /product/507f1f77bcf86cd799439011`

---

### `GET /products/category/:id`

- **Description**: Retrieves all products belonging to a specific category.
- **Path Parameters**:  
  `id` — Category name or ID.
- **Response**: Array of products in the specified category.

**Example**:  
`GET /products/category/Electronics`

---

### `PATCH /purchase/product/:id`

- **Description**: Decrements the stock of a product by the specified quantity (e.g., for purchases).
- **Path Parameters**:  
  `id` — MongoDB ObjectId of the product.
- **Request Body**:
```json
{
  "quantity": 5
}
```

---

### `PATCH /update/product/:id`

- **Description**: Updates a product's details.
- **Path Parameters**:  
  `id` — MongoDB ObjectId of the product.
- **Request Body**:
```json
{
  "updatedProduct": {
    "name": "Updated Laptop",
    "price": 1099.99
  }
}
```

---

### `DELETE /products/delete/:id`

- **Description**: Deletes a product by its MongoDB ObjectId.
- **Path Parameters**:  
  `id` — MongoDB ObjectId of the product.
- **Response**: Result of the delete operation.

**Example**:  
`DELETE /products/delete/507f1f77bcf86cd799439011`

---

### 📂 Categories

#### `GET /categories`

- **Description**: Retrieves all categories from the database.
- **Response**: Array of category objects.

**Example**:  
`GET /categories`

---

### 🛒 Orders

#### `POST /ordered/products`

- **Description**: Creates a new order in the database.
- **Request Body**:
```json
{
  "orderedProducts": {
    "email": "user@example.com",
    "products": [{ "name": "Laptop", "quantity": 1 }],
    "total": 999.99
  }
}
```

---

#### `GET /ordered/products`

- **Description**: Retrieves orders for the authenticated user, filtered by email.
- **Headers**:  
  `Authorization: Bearer <firebase-token>`
- **Query Parameters**:  
  `email` (required) — filters orders by user email.
- **Response**: Array of orders for the user.
- **Access**: Requires Firebase token.  
  Returns `403` if email doesn't match the token.

**Example**:  
`GET /ordered/products?email=user@example.com`

---

#### `DELETE /ordered/product/:id`

- **Description**: Deletes an order by its MongoDB ObjectId.
- **Path Parameters**:  
  `id` — MongoDB ObjectId of the order.
- **Response**: Result of the delete operation.

**Example**:  
`DELETE /ordered/product/507f1f77bcf86cd799439011`

---

#### `PATCH /ordered/products/:id`

- **Description**: Updates the stock of a product by incrementing it (e.g., for order cancellations).
- **Path Parameters**:  
  `id` — Product name (not ObjectId).
- **Request Body**:
```json
{
  "quantity": 5
}
```

---

## 🚀 Running the Server

1. Ensure MongoDB is running (locally or via MongoDB Atlas).

2. Start the server:

```bash
npm start
```

The server will run on [http://localhost:3000](http://localhost:3000) (or the port specified in the `.env` file).


## 📝 License

This project is licensed under the [MIT License](LICENSE).



