import { Config } from '../common/Types';
let configPromise: Promise<Config> | null = null;
let yamlPromise: Promise<string> | null = null;
let configData: Config | null = null;
const CONFIG_FILE_PATH = '/config/config.json';
const YAML_FILE_PATH = 'config/config.yaml';

export function loadConfig(): Promise<Config> {
    if (configData) {
        return Promise.resolve(configData);
    }
    if (configPromise === null) {
        configPromise = fetch(CONFIG_FILE_PATH)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to load config.json');
                }
                return response.json();
            })
            .then((json) => {
                configData = json as Config;
                return configData;
            });
    }
    return configPromise;
}

export function loadYAMLConfig(): Promise<string> {
    if (yamlPromise === null) {
        yamlPromise = fetch(YAML_FILE_PATH)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to load config.yaml');
                }
                return response.text();
            })
            .then((text) => {
                return text;
            });
    }
    return yamlPromise;
}

export function getConfig(): Config {
    if (!configData) {
        throw new Error('Config not loaded yet');
    }
    return configData;
}
