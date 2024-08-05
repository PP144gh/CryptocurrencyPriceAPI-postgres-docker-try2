const axios = require('axios');

const [,, pair, fetchInterval, priceOscillationTrigger] = process.argv;


let oldPrice = 0;
let newPrice = 0;
let newPriceTimestamp;
let priceOscillation = 0.0;
let alert = false;



const apiURL = `http://localhost:3001/price/${pair}`;



const monitorPrice = async () => {
  while (alert ==false) {
    if (oldPrice === 0) {
      const response = await axios.get(apiURL);
      oldPrice = response.data.price;
    } else {
      //console.log(oldPrice)

      await new Promise(resolve => setTimeout(resolve, fetchInterval)); 
      const response = await axios.get(apiURL);
      newPrice = response.data.price;
      newPriceTimestamp = response.data.timestamp;
      //console.log(newPrice)

      if (newPrice !== null) {
        const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

        if (Math.abs(changePercent) >= priceOscillationTrigger) {
          priceOscillation = parseFloat(changePercent.toFixed(4));
          alert = true;
          console.log(`PRICE OSCILLATION=${priceOscillation}`);
          console.log(`PRICE=${newPrice}`);
          console.log(`TIMESTAMP=${newPriceTimestamp}`);
        }

        oldPrice = newPrice;
      }
    }
  }
};

monitorPrice();
