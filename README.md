// Import necessary modules
const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const { Pool } = require('pg');
const stripe = require('stripe')('your-stripe-secret-key');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Initialize Elasticsearch Client
const esClient = new Client({ node: 'http://localhost:9200' });

// Initialize PostgreSQL Client
const pool = new Pool({
  user: 'your_db_user',
  host: 'localhost',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
});

// Utility function to run queries
const runQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const res = await client.query(query, params);
    return res.rows;
  } finally {
    client.release();
  }
};

// API to Search Jobs using Elasticsearch
app.get('/api/jobs/search', async (req, res) => {
  const { query } = req.query;
  try {
    const result = await esClient.search({
      index: 'jobs',
      body: {
        query: {
          match: { title: query }
        }
      }
    });
    res.json(result.hits.hits);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to Create Job Post (Stored in PostgreSQL and Elasticsearch)
app.post('/api/jobs', async (req, res) => {
  const { title, description, salary } = req.body;
  try {
    // Insert into PostgreSQL
    await runQuery('INSERT INTO jobs (title, description, salary) VALUES ($1, $2, $3)', [title, description, salary]);

    // Insert into Elasticsearch
    await esClient.index({
      index: 'jobs',
      body: { title, description, salary }
    });

    res.status(201).send('Job created');
  } catch (error) {
    res.status(500).send(error);
  }
});

// API for Subscription (Stripe Payment)
app.post('/api/subscribe', async (req, res) => {
  const { email, paymentMethodId, priceId } = req.body;

  try {
    const customer = await stripe.customers.create({ email, payment_method: paymentMethodId, invoice_settings: { default_payment_method: paymentMethodId } });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    res.json({ subscriptionId: subscription.id });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Serve the React frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// PostgreSQL Table Creation (Jobs)
const createTables = async () => {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        salary INTEGER
      );
    `);
    console.log("Jobs table created");
  } catch (error) {
    console.error("Error creating Jobs table", error);
  }
};

// Start the server after ensuring database table
app.listen(5000, async () => {
  await createTables();
  console.log('Server is running on http://localhost:5000');
});
