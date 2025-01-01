# Use the official Node.js image as a base
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or pnpm-lock.yaml) to the working directory
COPY package.json pnpm-lock.yaml ./

# Install system dependencies for canvas
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application code to the working directory
COPY . .

RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/main"]