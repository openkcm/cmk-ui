export enum KeyVersionStates {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
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
export default { KeyVersionStates, CloudProviders, KeyCreationTypes };