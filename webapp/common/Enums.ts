export enum KeyConfigStatuses {
    ACTIVE = 'ACTIVE',
    DISABLED = 'DISABLED',
}

export enum KeyTypes {
    HYOK = 'HYOK',
    BYOK = 'BYOK',
    SAPManaged = 'SAPManaged'
}

export enum KeyVersionStates {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

export enum CloudProviders {
    AWS = 'AWS',
    AZURE = 'AZURE',
    GCP = 'GCP'
}

export default { KeyConfigStatuses, KeyTypes, KeyVersionStates, CloudProviders };