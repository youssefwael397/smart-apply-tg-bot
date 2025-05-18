FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose the port your app runs on (if needed)
# EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
