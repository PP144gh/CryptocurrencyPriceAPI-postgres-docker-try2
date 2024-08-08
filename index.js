const path = require('path');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const pool = require('./database/dbConfig');  // Import the database configuration
const axios = require('axios');
const PORT = process.env.PORT || 3001;

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(cors());

// Global object to store interval IDs for each session
const intervalMap = {};

// Helper function to create a unique key for each monitoring session
function createSessionKey(pair, fetchInterval, priceOscillationTrigger) {
  return `${pair}-${fetchInterval}-${priceOscillationTrigger}`;
}

function extractValue(key, output) {
  const regex = new RegExp(`${key}=([^\\s]+)`);
  const match = output.match(regex);
  return match ? match[1] : null;
}

app.post('/start', async (req, res) => {
  const { pair, fetchInterval, priceOscillationTrigger } = req.body;
  const priceAPIUrl = `http://localhost:3001/price/${pair}`;

  if (!pair || !fetchInterval || !priceOscillationTrigger) {
    return res.status(400).send('Missing required fields');
  }

  const sessionKey = createSessionKey(pair, fetchInterval, priceOscillationTrigger);

  // Check if a process is already running for this session
  if (intervalMap[sessionKey]) {
    return res.status(400).send(`Process already running for session: ${sessionKey}`);
  }

  try {
    // Get the initial price with a timeout for reliability
    const initialResponse = await axios.get(priceAPIUrl, { timeout: 5000 });
    let oldPrice = initialResponse.data.price;

    // Start a repeated execution of the command
    const intervalId = setInterval(() => {
      const command = `node ./scripts/comparePrice.js ${priceAPIUrl} ${pair} ${fetchInterval} ${priceOscillationTrigger} ${oldPrice}`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Exec error for session ${sessionKey}: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Stderr for session ${sessionKey}: ${stderr}`);
          return;
        }
        const isAlert = extractValue("ALERT", stdout);
        const price = extractValue("PRICE", stdout);
        if (price !== null) {
          oldPrice = parseFloat(price);
        } else {
          console.warn(`No new price extracted for session ${sessionKey}, retaining oldPrice`);
        }

        if (isAlert) {
        const priceOscillation = extractValue("PRICE OSCILLATION", stdout);
        const timestamp = extractValue("TIMESTAMP", stdout);

        // Ensure values are valid before proceeding
        if (priceOscillation === null || price === null || timestamp === null) {
          console.error(`Failed to extract values for session ${sessionKey}: Output - ${stdout}`);
          return;
        }

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
            console.error(`Database error for session ${sessionKey}: ${dbError.message}`);
            return;
          }
          console.log(`Data saved for session ${sessionKey}:`, dbRes.rows[0]);
        });
        }
      });

    }, fetchInterval);

    // Store the interval ID
    intervalMap[sessionKey] = intervalId;

    res.send(`Started monitoring for session: ${sessionKey}`);
  } catch (error) {
    console.error(`Error fetching initial price for session ${sessionKey}: ${error.message}`);
    res.status(500).send('Failed to fetch initial price');
  }
});

app.post('/stop', (req, res) => {
  const { pair, fetchInterval, priceOscillationTrigger } = req.body;

  if (!pair || !fetchInterval || !priceOscillationTrigger) {
    return res.status(400).send('Missing required fields');
  }

  const sessionKey = createSessionKey(pair, fetchInterval, priceOscillationTrigger);

  const intervalId = intervalMap[sessionKey];

  if (!intervalId) {
    return res.status(400).send(`No process running for session: ${sessionKey}`);
  }

  // Clear the interval to stop execution
  clearInterval(intervalId);
  delete intervalMap[sessionKey];

  res.send(`Stopped monitoring for session: ${sessionKey}`);
});

app.get('/price/:pair', (req, res) => {
  const pair = req.params.pair;

  const command = `node ./scripts/priceFetch.js ${pair}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec error for pair ${pair}: ${error.message}`);
      return res.status(500).send('Error executing script');
    }
    if (stderr) {
      console.error(`Stderr for pair ${pair}: ${stderr}`);
      return res.status(500).send('Script execution returned an error');
    }

    const pairValue = extractValue("PAIR", stdout);
    const price = extractValue("PRICE", stdout);
    const timestamp = extractValue("TIMESTAMP", stdout);

    if (pairValue === null || price === null || timestamp === null) {
      console.error(`Failed to extract values for pair ${pair}: Output - ${stdout}`);
      return res.status(500).send('Failed to extract price data');
    }

    const result = {
      pair: pairValue,
      price,
      timestamp
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
