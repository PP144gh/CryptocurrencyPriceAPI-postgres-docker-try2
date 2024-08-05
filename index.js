const path = require('path');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const pool = require('../backend/database/dbConfig');  // Import the database configuration

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.static(path.resolve(__dirname, '../frontend/build')));
app.use(express.json()); // To parse JSON bodies

function extractValue(key, output) {
  const regex = new RegExp(`${key}=([^\\s]+)`);
  const match = output.match(regex);
  return match ? match[1] : null;
}

app.post('/start', (req, res) => {
  const { pair, fetchInterval, priceOscillationTrigger } = req.body;

  if (!pair || !fetchInterval || !priceOscillationTrigger) {
    return res.status(400).send('Missing required fields');
  }

  const command = `node ./backend/scripts/monitorPrice.js ${pair} ${fetchInterval} ${priceOscillationTrigger}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error executing script');
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return res.status(500).send('Script execution returned an error');
    }

    const priceOscillation = extractValue("PRICE OSCILLATION", stdout);
    const price = extractValue("PRICE", stdout);
    const timestamp = extractValue("TIMESTAMP", stdout);

    const result = {
      pair,
      fetchInterval,
      priceOscillationTrigger,
      priceOscillation: parseFloat(priceOscillation),
      price: parseFloat(price).toFixed(4),
      timestamp
    };

    // Insert result into PostgreSQL
    const query = `
      INSERT INTO price_data (pair, fetch_interval, price_oscillation_trigger, price_oscillation, price, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [result.pair, result.fetchInterval, result.priceOscillationTrigger, result.priceOscillation, result.price, result.timestamp];

    pool.query(query, values, (dbError, dbRes) => {
      if (dbError) {
        console.error(`Database error: ${dbError}`);
        return res.status(500).send('Error saving to database');
      }
      //res.send(dbRes.rows[0]);
      res.send(result);
    });
  });
});

app.get('/price/:pair', (req, res) => {
  const pair = req.params.pair;

  const command = `node ./backend/scripts/priceFetch.js ${pair}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error executing script');
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return res.status(500).send('Script execution returned an error');
    }

    const pair = extractValue("PAIR", stdout);
    const price = extractValue("PRICE", stdout);
    const timestamp = extractValue("TIMESTAMP", stdout);

    const result = {
      pair: pair,
      price: price,
      timestamp: timestamp
    };

    res.send(result);
  });
});

app.get('*', (req, res) => {
  res.status(400).send('Invalid Request');
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
