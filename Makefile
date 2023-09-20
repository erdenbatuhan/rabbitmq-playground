include application.properties

DEBUG = "false"
ENV_FILE = --env-file application.properties
COMPOSE_FILE = -f docker compose.yml

.PHONY: stop
stop:
	docker compose -p $(APP_NAME) down

.PHONY: start
start: stop
	docker compose -p $(APP_NAME) $(ENV_FILE) $(COMPOSE_FILE) up --build $(ARGS)

.PHONY: clean_volumes
clean_volumes: stop
	docker volume ls -qf dangling=true | egrep '^[a-z0-9]{64}' | xargs docker volume rm

.PHONY: clean
clean: clean_volumes
	docker compose -p $(APP_NAME) ps -aq | xargs docker rm -f
	docker images -a | awk '/$(APP_NAME)/ { print $$3 }' | xargs docker rmi -f

.PHONY: clean_data
clean_data: clean_volumes
	docker volume ls -q | grep "^$(APP_NAME).*\.data" | xargs -I {} docker volume rm {}

### ----------------------------------------------------------------------- ###
###  Caution: Use the following commands carefully!                         ###
###  This warning emphasizes the need for caution when using the commands.  ###
### ----------------------------------------------------------------------- ###

.PHONY: prune
prune: stop
	docker system prune

.PHONY: prune_with_volumes
prune_with_volumes: stop
	docker system prune -a --volumes
