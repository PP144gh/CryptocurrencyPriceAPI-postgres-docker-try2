const axios = require('axios');

const pair = process.argv[2]; // Get the pair from command-line arguments
const url = `https://api.uphold.com/v0/ticker/${pair}`;


axios.get(url)
  .then(response => {
    const timestamp = new Date().toISOString(); // Current timestamp
    const data = response.data;
    const price = data.ask;

    // Print values in a format that can be parsed by the server code
    console.log(`PAIR=${pair}`);
    console.log(`PRICE=${price}`);
    console.log(`TIMESTAMP=${timestamp}`);
  })
  .catch(error => {
    console.error('Error making request:', error);
  });
