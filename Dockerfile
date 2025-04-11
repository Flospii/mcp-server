# Stage 1: Build the app using Node
FROM node:lts-jod

# Set working directory inside the container
WORKDIR /app

# Copy the rest of your application code
COPY . .

