import { zipSync, strToU8 } from 'fflate';
import Api from 'kms/services/Api.service';
import { BYOKImportParameters, Key } from 'kms/common/Types';
import { KeyCreationTypes, KeyStates } from 'kms/common/Enums';

export function isBYOKAwaitingImport(key: Pick<Key, 'type' | 'state'> | undefined): boolean {
    if (!key) {
        return false;
    }
    return key.type === KeyCreationTypes.BYOK && key.state === KeyStates.PENDING_IMPORT;
}

export function isBase64KeyMaterial(keyMaterial: string | undefined | null): boolean {
    if (!keyMaterial) {
        return false;
    }
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    if (keyMaterial.length % 4 !== 0 || !base64Pattern.test(keyMaterial)) {
        return false;
    }
    try {
        return btoa(atob(keyMaterial)) === keyMaterial;
    }
    catch {
        return false;
    }
}

export function isKeyStateEditable(keyType: KeyCreationTypes, keyState: KeyStates): boolean {
    if (keyType === KeyCreationTypes.HYOK) {
        return false;
    }
    if (keyState === KeyStates.PENDING_IMPORT
      || keyState === KeyStates.PENDING_DELETION
      || keyState === KeyStates.DELETED
      || keyState === KeyStates.UNKNOWN) {
        return false;
    }
    return true;
}

export function canMakePrimary(isPrimary: boolean | undefined, keyState: KeyStates): boolean {
    if (isPrimary === true) {
        return false;
    }
    return keyState === KeyStates.ENABLED || keyState === KeyStates.DISABLED;
}

export function canDeleteWithoutWorkflow(keyType: KeyCreationTypes, keyState: KeyStates): boolean {
    return keyType === KeyCreationTypes.BYOK && keyState === KeyStates.PENDING_IMPORT;
}

export async function fetchImportParameters(api: Api, keyId: string): Promise<BYOKImportParameters | undefined> {
    return api.get<BYOKImportParameters>(`keys/${keyId}/importParams`);
}

function buildWrappingKeyReadme(params: BYOKImportParameters, key: Pick<Key, 'id'>): string {
    const lines = [
        `KeyID: ${key.id || 'unknown'}`,
        `Wrapping Algorithm: ${params.wrappingAlgorithm?.name ?? ''}`,
        `Hash Algorithm: ${params.wrappingAlgorithm?.hashFunction ?? ''}`
    ];
    return lines.join('\n');
}

export function buildWrappingKeyZipBlob(params: BYOKImportParameters, key: Pick<Key, 'id'>): Blob {
    const files: Record<string, Uint8Array> = {
        'publickey.pem': strToU8(params.publicKey ?? ''),
        'README.txt': strToU8(buildWrappingKeyReadme(params, key))
    };
    const zipData = zipSync(files);
    return new Blob([new Uint8Array(zipData)], { type: 'application/zip' });
}

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}

export function downloadWrappingKey(params: BYOKImportParameters, key: Pick<Key, 'id'>): void {
    const blob = buildWrappingKeyZipBlob(params, key);
    triggerBrowserDownload(blob, `WrappingPublicKeyFor-${key.id || 'unknown'}.zip`);
}
