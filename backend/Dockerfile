FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the backend port
EXPOSE 4000

# Start the app
CMD ["node", "index.js"] 