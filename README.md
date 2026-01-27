# KMS 2 UI

This repository contains the User Interface for the KMS2 Portal Project.

## Description

A web application built using SAPUI5.

Detailed SAPUI5 documentation & Fiori design guidelines:
- [SAPUI5 API documentation](https://sapui5.hana.ondemand.com/#/api)
- [SAPUI5 Samples](https://sapui5.hana.ondemand.com/#/controls)
- [SAP Fiori design guidelines for web applications](https://experience.sap.com/fiori-design-web/)

## Building the project

### IDE Setup
Using Visual Studio Code and enabling the following extensions is recommended:
- `lokalise.i18n-ally`
- `dbaeumer.vscode-eslint` (this will be auto configured, don't change any settings)
- `waderyan.gitblame`
- `ms-playwright.playwright`
- `SonarSource.sonarlint-vscode` (this will require you to log in with your SonarQube credentials. The project will be pre-populated)
- `jorgesanux.ui5-icon-explorer`
- `luizmz94.ui5-icons-symbols`
- `redhat.vscode-xml` (this is required so all XML files are formatted uniformly)

### Environment Setup
The API base URL is set in `webapp/config/config.json`. Modify the `apiBaseUrl` value if required. The default value is set to `http://localhost:8080`.

### Local UI
1. Install node
2. Install npm
3. Install dependencies
```bash
npm install
```
4. To start the local development server, run `npm start`. Using a 3rd party webserver is NOT supported due to using UI5 middleware. If using the mock server, remember to start that separately [as shown here](https://github.com/openkcm/cmk-ui/blob/main/README.md#local-api):
5. Application will start on port 8081
6. If using a local CMK API instance and are using MacOS, run `npm run startchrome` to open a Chrome instance with web security turned off. Using a normal Chrome browser will result in CORS errors.

### Building for deployment
1. Install dependencies
```bash
npm install
```
2. Run `npm run build`
4. Deploy from the `/dist` folder.

### Local API
1. To start local mock API server run:

```bash
npm run serve
```

## Commits, Branching & Pull Requests
### Commit messages
- Commit messages must follow the pattern - `<JIRA TICKET NUMBER>: <COMMIT DESCRIPTION>`
- Commit description must give a brief explanation of what is being achieved by the commit

## Docker

There is one `Dockerfile` available in a repository - `Dockerfile.dev`.

### Running UI image in a Docker container

1. Build Docker image from UI repository:

```bash
  make docker-dev-build
```

2. Run Docker container:

```bash
  make docker-dev-run
```

### Branch names
The following branch naming conventions apply:
- `main` - latest development code. New features and bug fixes are merged here.
- `master` - latest stable release.
- `story/<JIRA-ID>-short-description` - story branches must include the JIRA story/task ID along with a brief description.
- `bugfix/<JIRA-ID>-short-description` - feature branches must include the JIRA story/task ID along with a brief description.
- `hotfix/<release-no>` - hotfix branches are for fixing bugs found in production.
- `release/<release-no>` - release branches are created just before the release. They normally only contain final bug fixes, version bump & release notes.

### Pull Requests
Any code must undergo a review process before it can be merged.

In order for the merge to be allowed, the Pull Request must meet the following conditions criteria:
- Pull requests must contain a single commit message
- All tasks resulting from code review comments must be addressed.
- All code quality gates must pass.
- Code must be approved by at two least reviewer's.

## Authors

UI development team

## License

This project is licensed under the [NAME HERE] License - see the LICENSE.md file for details

## Executing program with k3d
### Deploying with Helm charts: `make k3d-apply-ui-helm-chart`
#### Prerequisites - install docker and helm

Before you begin, ensure you have the following installed on your system:

- [Docker](https://docs.docker.com/get-docker/)
- [Helm](https://helm.sh/docs/intro/install/) (required for managing Kubernetes charts)

#### Prerequisites - create k3d cluster
Pull cmk project
- [https://github.com/openkcm/cmk](https://github.com/openkcm/cmk)

Follow instructions from README.md, to install cmk cluster
run 
```bash
make start-cmk
```
or 
```bash
make start-cmk-colima
```

After setting up cmk cluster:

#### Run
```bash
make k3d-start-ui
```

To access UI, run the command displayed in console. For example:
```bash
export POD_NAME=$(kubectl get pods --namespace cmk -l "app.kubernetes.io/name=ui-app,app.kubernetes.io/instance=ui" -o jsonpath="{.items[0].metadata.name}")
export CONTAINER_PORT=$(kubectl get pod --namespace cmk $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
echo "Visit http://127.0.0.1:8086 to use your application"
kubectl --namespace cmk port-forward $POD_NAME 8086:$CONTAINER_PORT
```
