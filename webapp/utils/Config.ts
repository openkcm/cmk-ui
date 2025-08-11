import { Config } from '../common/Types';
let configPromise: Promise<Config> | null = null;
let configData: Config | null = null;

export function loadConfig(): Promise<Config> {
    if (configData) {
        return Promise.resolve(configData);
    }
    if (configPromise === null) {
        configPromise = fetch('/config/config.json')
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

export function getConfig(): Config {
    if (!configData) {
        throw new Error('Config not loaded yet');
    }
    return configData;
}
