# Use Node.js base image
FROM node

# Set up fonts directory
RUN mkdir -p /usr/share/fonts/truetype/custom

# Copy all fonts in one layer
COPY ./src/utils/generateImage/fonts/Sriracha.ttf /usr/share/fonts/truetype/custom/
COPY --chown=104:106 fonts /usr/share/fonts/truetype/more/
COPY assets/fonts/MyCustomFont.ttf /usr/share/fonts/truetype/custom/

# Update font cache once after all fonts are copied
RUN fc-cache -fv

# Verify font installation
RUN fc-list | grep "Sriracha"

# Set working directory
WORKDIR /app

# Install system dependencies required for 'canvas'
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    fontconfig \
    libpangocairo-1.0-0 \
    libjpeg-dev \
    libgif-dev \
    libfontconfig1 \
    fonts-freefont-ttf \
    librsvg2-dev \
    pkg-config \
    python3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
    
RUN apt update && apt install -y curl build-essential
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
RUN source $HOME/.cargo/env

# Set environment to force native builds for canvas and add Python path
ENV npm_config_build_from_source=true
ENV yarn_config_build_from_source=true
ENV PYTHON=/usr/bin/python3

# Copy package files and install dependencies with specific canvas version
COPY package.json ./
RUN yarn add canvas@2.11.2 && yarn install

# Copy the application code
COPY . .

# Generate Prisma client (if applicable)
RUN npx prisma generate

# Build the application
RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
