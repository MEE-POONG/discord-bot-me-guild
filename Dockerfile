# Use the latest Node.js stable or LTS version instead of Node 22 (replace with Node 20 if required)
FROM node:20-bullseye

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies required for the canvas module
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package.json and lock file to the working directory
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally and install project dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the rest of the application code to the working directory
COPY . .

# Generate Prisma client (if you're using Prisma)
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the port the app will run on
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/main"]