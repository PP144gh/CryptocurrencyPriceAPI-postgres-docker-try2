// app.test.js
const request = require('supertest');
const axios = require('axios');
const { exec } = require('child_process');
const pool = require('../database/dbConfig');
const app = require('../app'); // Import the app from app.js

jest.mock('axios');
jest.mock('child_process');
jest.mock('../database/dbConfig');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.useFakeTimers(); // Use Jest's fake timers to control setInterval and setTimeout
    jest.resetAllMocks(); // Reset all mocks before each test
    app.locals.intervalMap = {}; // Reset the intervalMap before each test
  });

  afterEach(() => {
    jest.runOnlyPendingTimers(); // Run any pending timers to ensure they are completed
    jest.clearAllTimers(); // Clear all timers to ensure no open handles remain
  });

  describe('POST /start', () => {
    it('should start monitoring for a valid request', async () => {
      axios.get.mockResolvedValue({ data: { price: 100 } });
      exec.mockImplementation((command, callback) => {
        callback(null, 'PRICE=100 TIMESTAMP=2023-01-01 ALERT=true', '');
      });
      pool.query.mockImplementation((query, values, callback) => {
        callback(null, { rows: [{ ...values }] });
      });

      const response = await request(app)
        .post('/start')
        .send({ pair: 'BTC-USD', fetchInterval: 1000, priceOscillationTrigger: 0.05 });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Started monitoring for session: BTC-USD-1000-0.05');
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/price/BTC-USD', { timeout: 5000 });
    });

    it('should not start monitoring if process already running', async () => {
      app.locals.intervalMap = { 'BTC-USD-1000-0.05': true };

      const response = await request(app)
        .post('/start')
        .send({ pair: 'BTC-USD', fetchInterval: 1000, priceOscillationTrigger: 0.05 });

      expect(response.status).toBe(400);
      expect(response.text).toContain('Process already running for session: BTC-USD-1000-0.05');
    });

    it('should return error if required fields are missing', async () => {
      const response = await request(app).post('/start').send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing required fields');
    });

    it('should handle axios request failure gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'));

      const response = await request(app)
        .post('/start')
        .send({ pair: 'BTC-USD', fetchInterval: 1000, priceOscillationTrigger: 0.005 });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to fetch initial price');
    });
  });

  describe('POST /stop', () => {
    it('should stop monitoring for a running session', async () => {
      const intervalId = setInterval(() => {}, 1000);
      app.locals.intervalMap = { 'BTC-USD-1000-0.05': intervalId };

      const response = await request(app)
        .post('/stop')
        .send({ pair: 'BTC-USD', fetchInterval: 1000, priceOscillationTrigger: 0.05 });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Stopped monitoring for session: BTC-USD-1000-0.05');

      // Run pending timers to simulate interval clearing
      jest.runOnlyPendingTimers();

      // Ensure the interval is cleared by checking that the key is not in the intervalMap
      expect(app.locals.intervalMap).not.toHaveProperty('BTC-USD-1000-0.05');
    });

    it('should return error if no process is running', async () => {
      const response = await request(app)
        .post('/stop')
        .send({ pair: 'BTC-USD', fetchInterval: 1000, priceOscillationTrigger: 0.05 });

      expect(response.status).toBe(400);
      expect(response.text).toContain('No process running for session: BTC-USD-1000-0.05');
    });
  });

  describe('GET /price/:pair', () => {
    it('should fetch price for a valid pair', async () => {
      exec.mockImplementation((command, callback) => {
        callback(null, 'PAIR=BTC-USD PRICE=100 TIMESTAMP=2023-01-01', '');
      });

      const response = await request(app).get('/price/BTC-USD');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ pair: 'BTC-USD', price: '100', timestamp: '2023-01-01' });
    });

    it('should return error if exec fails', async () => {
      exec.mockImplementation((command, callback) => {
        callback(new Error('exec error'), null, null);
      });

      const response = await request(app).get('/price/BTC-USD');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error executing script');
    });

    it('should return error if failed to extract values', async () => {
      exec.mockImplementation((command, callback) => {
        callback(null, '', '');
      });

      const response = await request(app).get('/price/BTC-USD');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to extract price data');
    });
  });

  describe('GET *', () => {
    it('should return 400 for invalid requests', async () => {
      const response = await request(app).get('/invalid-endpoint');

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid Request');
    });
  });
});
