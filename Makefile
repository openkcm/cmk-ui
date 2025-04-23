#
# Envs
#

TAG := latest
UI_APP_NAME := ui-server
UI_DEV_TARGET := dev
UI_TEST_TARGET := test
IMAGE_NAME := $(UI_APP_NAME)-$(UI_DEV_TARGET):$(TAG)
DOCKERFILE_DIR := .
DOCKERFILE_NAME := Dockerfile
CONTEXT_DIR := .
NAMESPACE:=ui
CLUSTER_NAME:=cmkcluster

#
# Docker commands
#

.PHONY: docker-dev-build docker-dev-run

# Target to build Docker image
docker-dev-build:
	docker build -f $(DOCKERFILE_DIR)/$(DOCKERFILE_NAME) -t $(IMAGE_NAME) $(CONTEXT_DIR)

# Target to run Docker image
docker-dev-run:
	docker run -it -p 8080:8080 $(IMAGE_NAME)

#
# Helm commands
#

.PHONY: build-helm apply-helm-chart apply-ui-helm-chart

# Target to build helm chart
build-helm:
	helm dependency build ./charts

# Target to apply helm chart
apply-helm-chart:
	@echo "Applying Helm chart."
	helm upgrade --install $(CHART_NAME) $(CHART_DIR) --namespace $(APPLY_NAMESPACE) --create-namespace

# Target to apply UI helm chart
apply-ui-helm-chart:
	@echo "Applying CMK Helm chart."
	$(MAKE) helm CHART_NAME=ui CHART_DIR=./charts APPLY_NAMESPACE=$(NAMESPACE)

# Target to port forward UI app from cluster port 8080 to local port 80
port-forward:
	kubectl port-forward --namespace $(NAMESPACE) svc/ui-ui-app 80:8080

#
# k3d commands
#

.PHONY: k3d-import-image k3d-build-helm k3d-import-ui-image k3d-apply-ui-helm-chart k3d-start-ui

# Target to build Docker image within k3d
k3d-import-image:
	@echo "Importing Docker image into k3d."
	k3d image import $(APPLY_IMAGE_NAME) -c $(CLUSTER_NAME)

# Target to build helm chart for k3d
k3d-build-helm: build-helm

# Target to build the CMK image within k3d
k3d-import-ui-image:
	@echo "Building the cmk image within k3d."
	@$(MAKE) k3d-import-image APPLY_IMAGE_NAME=$(IMAGE_NAME)

# Target to apply UI helm chart on k3d
k3d-apply-ui-helm-chart: apply-ui-helm-chart

# Target to start UI locally on k3d
k3d-start-ui: docker-dev-build k3d-import-ui-image k3d-apply-ui-helm-chart

#
# Gardener commands
#

.PHONY: gardener-build-helm gardener-apply-ui-helm-chart

# Target to build helm chart for Gardener
gardener-build-helm: build-helm

# Target to apply UI helm chart on Gardener
gardener-apply-ui-helm-chart: apply-ui-helm-chart
