# Backend Dockerfile
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json into the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . .
COPY database database
COPY scripts scripts

# Expose the port the app runs on
EXPOSE 3001

# Define environment variable
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
