# Use an official Node.js runtime as a base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Set arguments
ARG SRC_DIR
ARG PORT

# Install the project dependencies
COPY ${SRC_DIR}/package*.json .
RUN npm install

# Bundle app source
COPY ${SRC_DIR} .

# Expose the port
EXPOSE $PORT

# Start the app
CMD [ "npm", "run", "serve" ]
