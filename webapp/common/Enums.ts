export enum KeyStates {
    ENABLED = 'ENABLED',
    DISABLED = 'DISABLED',
}

export enum CloudProviders {
    AWS = 'AWS',
    AZURE = 'AZURE',
    GCP = 'GCP'
}

export enum KeyCreationTypes {
    SYSTEM_MANAGED = 'SYSTEM_MANAGED',
    HYOK = 'HYOK',
    BYOK = 'BYOK'
}

export enum KeyConfigDetailPanelTypes {
    SYSTEM = 'system',
    KEY = 'key'
}
export default { KeyStates, CloudProviders, KeyCreationTypes, KeyConfigDetailPanelTypes };