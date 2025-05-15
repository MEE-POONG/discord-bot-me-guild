# Use Node.js base image
FROM node:22.14.0

# Set working directory
WORKDIR /app

# Copy package files and install dependencies with specific canvas version
COPY package.json ./
RUN yarn install

# Copy the application code
COPY . .

# Generate Prisma client (if applicable)
RUN npx prisma generate

# Build the application
RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
