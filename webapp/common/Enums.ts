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

export default { KeyConfigStatuses, KeyTypes, KeyVersionStates };