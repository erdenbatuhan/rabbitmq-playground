## RabbitMQ Sample Usecase

## Contents

- [Running with Docker](#running-with-docker)
    - [Start Docker Containers](#start-docker-containers)
    - [Stop Docker Containers](#stop-docker-containers)
    - [Clean Up Docker Resources](#clean-up-docker-resources)

## Running with Docker

### Start Docker Containers

To start Docker containers for the application, use the following command:

```bash
make start
```

This command also stops any existing containers related to this application before starting new ones.

### Stop Docker Containers

To stop all Docker containers related to this application, use the following command:

```bash
make stop
```

### Clean Up Docker Resources

To clean up Docker resources, including removing containers, images, and volumes, use the following command:

```bash
make clean
```

This command will:

- Stop any existing containers related to the application and remove them
- Remove Docker images related to the application
