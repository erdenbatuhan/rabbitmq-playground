# Use an official Node.js runtime as a base image
FROM node:18

# Set arguments
ARG SRC_DIR
ARG PORT

# Install dependencies for rabbit
WORKDIR /rabbit
COPY rabbit/package*.json .
RUN npm install

# Install dependencies for app
WORKDIR /${SRC_DIR}
COPY ${SRC_DIR}/package*.json .
RUN npm install

# Bundle app source
COPY ${SRC_DIR} .
COPY rabbit /rabbit

# Run app
EXPOSE ${PORT}
CMD [ "npm", "run", "serve" ]
