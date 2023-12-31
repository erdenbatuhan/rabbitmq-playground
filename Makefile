include application.properties

.PHONY: stop
stop:
	docker compose -p $(APP_NAME) down

.PHONY: start
start: stop
	docker compose -p $(APP_NAME) --env-file application.properties up --build $(ARGS)

.PHONY: clean_dangling_volumes
clean_dangling_volumes: stop
	docker volume ls -qf "dangling=true" | egrep '^[a-z0-9]{64}' | xargs docker volume rm -f

.PHONY: clean
clean: clean_dangling_volumes
	docker compose -p $(APP_NAME) ps -aq | xargs docker rm -f
	docker network ls -qf "name=$(APP_NAME).*" -q | xargs docker network rm -f
	docker images -qf "label=com.docker.compose.project=$(APP_NAME)" | xargs docker rmi -f

.PHONY: clean_data
clean_data: clean_dangling_volumes
	docker volume ls -qf "label=com.docker.compose.project=$(APP_NAME)" | xargs docker volume rm -f

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
