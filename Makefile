.PHONY: docker-dev-build docker-dev-run

TAG := latest
UI_APP_NAME := ui-server
UI_DEV_TARGET := dev
UI_TEST_TARGET := test
IMAGE_NAME := $(UI_APP_NAME)-$(UI_DEV_TARGET):$(TAG)
DOCKERFILE_DIR := .
DOCKERFILE_NAME := Dockerfile.dev
CONTEXT_DIR := .

# Target to build Docker image
docker-dev-build:
	docker build -f $(DOCKERFILE_DIR)/$(DOCKERFILE_NAME) -t $(IMAGE_NAME) $(CONTEXT_DIR)

# Target to run Docker image
docker-dev-run:
	docker run -it -p 80:80 $(IMAGE_NAME)