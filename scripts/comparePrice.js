// comparePrice.js

const axios = require('axios');

const [,, apiURL, pair, fetchInterval, priceOscillationTrigger, oldPrice] = process.argv;

let newPrice = 0;
let newPriceTimestamp;
let priceOscillation = 0.0;
let isAlert = false;


const comparePrice = async () => {
  try {
    const response = await axios.get(apiURL);
    newPrice = response.data.price;
    newPriceTimestamp = response.data.timestamp;

    if (newPrice !== null) {
      const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

      if (Math.abs(changePercent) >= priceOscillationTrigger) {
        priceOscillation = parseFloat(changePercent.toFixed(4));
        isAlert = true;
      
      }

        console.log(`ALERT=${isAlert}`);
        console.log(`PRICE OSCILLATION=${priceOscillation}`);
        console.log(`PRICE=${newPrice}`);
        console.log(`TIMESTAMP=${newPriceTimestamp}`);
     
    }
  } catch (error) {
    console.error(`Error fetching price data: ${error.message}`);
  }
};

comparePrice();
