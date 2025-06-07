FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to run the built app
RUN npm install -g serve

# Expose default serve port
EXPOSE 8080

# Start the app
CMD ["serve", "-s", "dist", "-l", "8080"] 