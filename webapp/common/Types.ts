import { KeyConfigStatuses, KeyTypes, KeyVersionStates } from "kms/common/Enums";

export interface System {
    id: string;
    keyConfiguration: KeyConfig;
    name: string;
    key: string;
};
export interface KeyConfig {
    name: string;
    id: string;
    keys: Key[];
    systems: System[];
    createdBy: string;
    createdOn: string;
}
export interface Key {
    id: string;
    primary: boolean;
    state: KeyConfigStatuses;
    type: KeyTypes;
    versions: Version[];
    labels: Label[];
};
export interface Version {
    id: string;
    state: KeyVersionStates;
};
export interface Label {
    id: string;
    name: string;
    value: string;
};