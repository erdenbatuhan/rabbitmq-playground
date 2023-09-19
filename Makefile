include application.properties

ENV_FILE = --env-file application.properties
COMPOSE_FILE = -f docker-compose.yml

.PHONY: stop
stop:
	docker-compose -p $(APP_NAME) down

.PHONY: start
start: stop
	docker-compose -p $(APP_NAME) $(ENV_FILE) $(COMPOSE_FILE) up --build

.PHONY: clean
clean: stop
	docker-compose -p $(APP_NAME) ps -aq | xargs docker rm -f
	docker images -a | awk '/$(APP_NAME)/ { print $$3 }' | xargs docker rmi -f
