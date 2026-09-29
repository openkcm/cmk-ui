import * as Byok from 'kms/common/Byok';
import { KeyCreationTypes, KeyStates } from 'kms/common/Enums';
import { BYOKImportParameters, Key } from 'kms/common/Types';

QUnit.module('Byok Unit Tests');

QUnit.test('isBYOKAwaitingImport is true only for a BYOK key pending import', function (assert) {
    assert.strictEqual(
        Byok.isBYOKAwaitingImport({ type: KeyCreationTypes.BYOK, state: KeyStates.PENDING_IMPORT }),
        true,
        'BYOK + PENDING_IMPORT awaits import'
    );
});
QUnit.test('isBYOKAwaitingImport is false for other type/state combinations', function (assert) {
    assert.strictEqual(Byok.isBYOKAwaitingImport({ type: KeyCreationTypes.BYOK, state: KeyStates.ENABLED }), false, 'enabled BYOK does not await import');
    assert.strictEqual(Byok.isBYOKAwaitingImport({ type: KeyCreationTypes.SYSTEM_MANAGED, state: KeyStates.PENDING_IMPORT }), false, 'non-BYOK pending import does not qualify');
    assert.strictEqual(Byok.isBYOKAwaitingImport(undefined), false, 'undefined key does not await import');
});

QUnit.test('isBase64KeyMaterial accepts valid base64', function (assert) {
    assert.strictEqual(Byok.isBase64KeyMaterial(btoa('hello world!')), true, 'round-trippable base64 is accepted');
    assert.strictEqual(Byok.isBase64KeyMaterial('aGVsbG8='), true, 'padded base64 is accepted');
});
QUnit.test('isBase64KeyMaterial rejects invalid material', function (assert) {
    assert.strictEqual(Byok.isBase64KeyMaterial(''), false, 'empty string is rejected');
    assert.strictEqual(Byok.isBase64KeyMaterial(null), false, 'null is rejected');
    assert.strictEqual(Byok.isBase64KeyMaterial(undefined), false, 'undefined is rejected');
    assert.strictEqual(Byok.isBase64KeyMaterial('not base64!!'), false, 'non-base64 characters are rejected');
    assert.strictEqual(Byok.isBase64KeyMaterial('abc'), false, 'length not divisible by 4 is rejected');
});

QUnit.test('isKeyStateEditable is false for HYOK regardless of state', function (assert) {
    assert.strictEqual(Byok.isKeyStateEditable(KeyCreationTypes.HYOK, KeyStates.ENABLED), false, 'HYOK keys are never editable');
});
QUnit.test('isKeyStateEditable is false for non-editable lifecycle states', function (assert) {
    assert.strictEqual(Byok.isKeyStateEditable(KeyCreationTypes.BYOK, KeyStates.PENDING_IMPORT), false, 'PENDING_IMPORT is not editable');
    assert.strictEqual(Byok.isKeyStateEditable(KeyCreationTypes.BYOK, KeyStates.PENDING_DELETION), false, 'PENDING_DELETION is not editable');
    assert.strictEqual(Byok.isKeyStateEditable(KeyCreationTypes.BYOK, KeyStates.DELETED), false, 'DELETED is not editable');
    assert.strictEqual(Byok.isKeyStateEditable(KeyCreationTypes.BYOK, KeyStates.UNKNOWN), false, 'UNKNOWN is not editable');
});
QUnit.test('isKeyStateEditable is true for editable states', function (assert) {
    assert.strictEqual(Byok.isKeyStateEditable(KeyCreationTypes.BYOK, KeyStates.ENABLED), true, 'ENABLED is editable');
    assert.strictEqual(Byok.isKeyStateEditable(KeyCreationTypes.SYSTEM_MANAGED, KeyStates.DISABLED), true, 'DISABLED is editable');
});

QUnit.test('canMakePrimary is false when the key is already primary', function (assert) {
    assert.strictEqual(Byok.canMakePrimary(true, KeyStates.ENABLED), false, 'an already-primary key cannot be made primary');
});
QUnit.test('canMakePrimary is true for enabled or disabled non-primary keys', function (assert) {
    assert.strictEqual(Byok.canMakePrimary(false, KeyStates.ENABLED), true, 'enabled non-primary key can be made primary');
    assert.strictEqual(Byok.canMakePrimary(undefined, KeyStates.DISABLED), true, 'disabled non-primary key can be made primary');
});
QUnit.test('canMakePrimary is false for pending states', function (assert) {
    assert.strictEqual(Byok.canMakePrimary(false, KeyStates.PENDING_IMPORT), false, 'pending keys cannot be made primary');
});

QUnit.test('canDeleteWithoutWorkflow is true only for BYOK pending import', function (assert) {
    assert.strictEqual(Byok.canDeleteWithoutWorkflow(KeyCreationTypes.BYOK, KeyStates.PENDING_IMPORT), true, 'BYOK pending import can be deleted without a workflow');
    assert.strictEqual(Byok.canDeleteWithoutWorkflow(KeyCreationTypes.BYOK, KeyStates.ENABLED), false, 'enabled BYOK requires a workflow');
    assert.strictEqual(Byok.canDeleteWithoutWorkflow(KeyCreationTypes.HYOK, KeyStates.PENDING_IMPORT), false, 'HYOK requires a workflow');
});

QUnit.test('buildWrappingKeyZipBlob produces a non-empty zip blob', function (assert) {
    const params = {
        publicKey: '-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----',
        wrappingAlgorithm: { name: 'RSAES_OAEP_SHA_256', hashFunction: 'SHA-256' }
    } as BYOKImportParameters;
    const blob = Byok.buildWrappingKeyZipBlob(params, { id: 'key-42' });
    assert.ok(blob instanceof Blob, 'a Blob is returned');
    assert.strictEqual(blob.type, 'application/zip', 'blob has the zip MIME type');
    assert.ok(blob.size > 0, 'blob is non-empty');
});
QUnit.test('buildWrappingKeyZipBlob tolerates missing optional fields', function (assert) {
    const blob = Byok.buildWrappingKeyZipBlob({} as BYOKImportParameters, {} as Pick<Key, 'id'>);
    assert.ok(blob instanceof Blob, 'a Blob is still produced when fields are missing');
    assert.ok(blob.size > 0, 'blob is non-empty even with default content');
});
