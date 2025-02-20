# Use Node.js base image
FROM node

# Set working directory
WORKDIR /app

# Install system dependencies required for 'canvas'
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set environment to force native builds for canvas
ENV npm_config_build_from_source=true
ENV yarn_config_build_from_source=true

# Copy package.json and yarn.lock to the working directory
COPY package.json ./

# Install dependencies with yarn
RUN yarn install

# Copy the application code to the working directory
COPY . .

COPY --chown=104:106 fonts /usr/share/fonts/truetype/more/
COPY --chown=104:106 fonts /opt/cool/systemplate/usr/share/fonts/truetype/more/

# Generate Prisma client (if applicable)
RUN npx prisma generate

# Build the application
RUN yarn build

# Verify that 'canvas.node' is built correctly (optional)
# RUN ls -al node_modules/canvas/build/

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]