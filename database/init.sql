-- init.sql
CREATE TABLE IF NOT EXISTS price_data (
    id SERIAL PRIMARY KEY,
    pair VARCHAR(10),
    fetch_interval INTEGER,
    price_oscillation_trigger DECIMAL,
    price_oscillation DECIMAL,
    price DECIMAL(10, 4),
    timestamp TIMESTAMP
);

-- Optionally, insert some initial data
-- INSERT INTO price_data (pair, fetch_interval, price_oscillation_trigger, price_oscillation, price, timestamp)
-- VALUES ('BTC-USD', 5000, 1.5, 1.2, 40000.0000, NOW());
