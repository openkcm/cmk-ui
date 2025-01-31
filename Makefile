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

NAMESPACE:=cmk
CLUSTER_NAME:=cmkcluster

# Target to build Docker image within k3d
k3d-import-image:
	@echo "Importing Docker image into k3d."
	k3d image import $(APPLY_IMAGE_NAME) -c $(CLUSTER_NAME)

# Target to build the CMK image within k3d
k3d-import-ui-image:
	@echo "Building the cmk image within k3d."
	@$(MAKE) k3d-import-image APPLY_IMAGE_NAME=$(IMAGE_NAME)

k3d-apply-helm-chart:
	@echo "Applying Helm chart."
	helm upgrade --install $(CHART_NAME) $(CHART_DIR) --namespace $(APPLY_NAMESPACE)

k3d-apply-ui-helm-chart:
	@echo "Applying CMK Helm chart."
	$(MAKE) k3d-apply-helm-chart CHART_NAME=ui CHART_DIR=./charts APPLY_NAMESPACE=$(NAMESPACE)

start-ui: docker-dev-build k3d-import-ui-image k3d-apply-ui-helm-chart

port-forward:
	kubectl port-forward --namespace $(NAMESPACE) svc/ui-ui-app 8086:80