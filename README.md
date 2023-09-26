## RabbitMQ Playground

## Contents

- [Running with Docker](#running-with-docker)
    - [Start Docker Containers](#start-docker-containers)
    - [Stop Docker Containers](#stop-docker-containers)
    - [Clean Up Docker Resources](#clean-up-docker-resources)

## Running with Docker

### Start Docker Containers

To start Docker containers for the application, use the following command:

```bash
make start ARGS=-d # Run the containers in background
```

This command also stops any existing containers related to this application before starting new ones.

### Stop Docker Containers

To stop all Docker containers related to this application, use the following command:

```bash
make stop
```

### Clean Up Docker Resources

To clean up Docker resources, including removing containers, images, and volumes, use the following command:

This command will remove images, containers, volumes (e.g., dangling volumes such as dangling Docker volumes such as _0c18b ... 362cf_), networks, and orphaned containers.

```bash
make clean
```

### Clean Up Data

To clean up the RabbitMQ data, use the following command:

Please note that this action is irreversible and will result in the removal of all your data!

```bash
make clean_data
```
