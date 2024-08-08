# Price feed API alerts + database + docker assessment try #2

This was a technical assessment in an interview process I was in. This try has no frontend and is only focused on the backend part, which is severely improved in comparison to try #1. One can make requests to it via Postman.
The backend queries a cryptocurrency price API. The exposed endpoints are:

http://localhost:3001/price/BTC-USD

http://localhost:3001/start with example body
```json
{
    "pair" : "SOL-USD",
    "fetchInterval" : "5000",
    "priceOscillationTrigger" : "0.0001"
}"
```

and http://localhost:3001/stop

with example body
```json
{
    "pair" : "ETH-USD",
    "fetchInterval" : "5000",
    "priceOscillationTrigger" : "0.0001"
}
```

See the Postman collection in file PriceFeedAPI.postman_collection.json


The /start creates a monitoring process that compares prices after fetchInterval ms and emits an alert and stores the values in the db if the price oscillated more than priceOscillationTrigger % in the given fetch interval. The pair-fetchInterval-priceOscillationTrigger is a unique identifier of the monitoring process.

The /stop stops the monitoring of a given monitoring process, identified by pair-fetchInterval-priceOscillationTrigger.

## setup instructions:

have docker installed.

### running the project
in root directory:

```
chmod +x run.sh
./run.sh
```

## Request/response examples

### 1
request: http://localhost:3001/price/BTC-USD 

response:
```json
{
    "pair": "BTC-USD",
    "price": "57245.0366226897",
    "timestamp": "2024-08-08T09:34:00.314Z"
}
```

### 2
request: http://localhost:3001/start with example body

```json
{
    "pair" : "SOL-USD",
    "fetchInterval" : "5000",
    "priceOscillationTrigger" : "0.0001"
}
```

response: 

Started monitoring for session: SOL-USD-5000-0.0001 , 
Process already running for session: SOL-USD-5000-0.0001

### 3
request: http://localhost:3001/stop with example body
```json
{
    "pair" : "ETH-USD",
    "fetchInterval" : "5000",
    "priceOscillationTrigger" : "0.0001"
}
```

response: 

Stopped monitoring for session: SOL-USD-5000-0.0001 , 
No process running for session: SOL-USD-5000-0.0001

## test
```
npm test
```