docker-compose down --remove-orphans
docker volume rm cryptocurrencypriceapi-postgres-docker-try2_pgdata
docker-compose up --build