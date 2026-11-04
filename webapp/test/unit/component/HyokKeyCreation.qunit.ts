import HyokKeyRegistration from 'kms/component/HyokKeyCreation';
import { SegmentedButton$SelectionChangeEvent } from 'sap/m/SegmentedButton';
import { HYOKProviders } from 'kms/common/Enums';

const { module: qModule, test } = QUnit;

interface GetBindingContextStub {
    getPath: () => string | undefined
}
interface SegmentedButtonSourceStub {
    getBindingContext: (model: string) => GetBindingContextStub | undefined
    getSelectedKey: () => string
}
interface SegmentedButtonEventStub {
    getSource: () => SegmentedButtonSourceStub
}

class ModelStub {
    public store: Record<string, unknown> = {};

    public data: Record<string, unknown> = {};

    public setProperty(path: string, value: unknown): void {
        this.store[path] = value;
    }

    public getProperty(path: string): unknown {
        return this.store[path];
    }

    public setData(data: Record<string, unknown>): void {
        this.data = { ...this.data, ...data };
    }

    public getData(): Record<string, unknown> {
        return this.data;
    }
}

class PopoverStub {
    public busy = false;

    public setBusy(value: boolean): void {
        this.busy = value;
    }
}

interface TogglingTarget {
    onToggleCertViewMode: (event: SegmentedButton$SelectionChangeEvent) => void
}

function createRegistration(keyCreationModel: ModelStub): TogglingTarget {
    const instance = Object.create(HyokKeyRegistration.prototype) as object;
    Object.assign(instance, { keyCreationModel });
    return instance as TogglingTarget;
}

function buildEvent(path: string | undefined | null, hasContext = true): SegmentedButton$SelectionChangeEvent {
    const stub: SegmentedButtonEventStub = {
        getSource: () => ({
            getBindingContext: () => (hasContext ? { getPath: () => path ?? undefined } : undefined),
            getSelectedKey: () => 'Hex'
        })
    };
    return stub as unknown as SegmentedButton$SelectionChangeEvent;
}

qModule('HyokKeyRegistration - prototype');

test('exposes the certificate view toggle handler', (assert) => {
    assert.strictEqual(typeof HyokKeyRegistration.prototype.onToggleCertViewMode, 'function', 'onToggleCertViewMode exists');
});

qModule('HyokKeyRegistration - onToggleCertViewMode');

test('updates the certViewMode for the bound path', (assert) => {
    const keyCreationModel = new ModelStub();
    const registration = createRegistration(keyCreationModel);
    registration.onToggleCertViewMode(buildEvent('/cryptoRolesCerts/0'));
    assert.strictEqual(keyCreationModel.getProperty('/cryptoRolesCerts/0/certViewMode'), 'Hex', 'view mode set on bound path');
});

test('does nothing when the binding path is missing', (assert) => {
    const keyCreationModel = new ModelStub();
    const registration = createRegistration(keyCreationModel);
    registration.onToggleCertViewMode(buildEvent(undefined));
    assert.deepEqual(keyCreationModel.store, {}, 'no property set when path missing');
});

test('does nothing when there is no binding context', (assert) => {
    const keyCreationModel = new ModelStub();
    const registration = createRegistration(keyCreationModel);
    registration.onToggleCertViewMode(buildEvent(undefined, false));
    assert.deepEqual(keyCreationModel.store, {}, 'no property set when context missing');
});

qModule('HyokKeyRegistration - resetModel');

interface ResetModelTarget {
    resetModel: () => void
}

function createResetTarget(keyCreationModel: ModelStub, subtype: HYOKProviders, certs: { hyokManagementCerts: unknown[], cryptoRolesCerts: unknown[] }): ResetModelTarget {
    const instance = Object.create(HyokKeyRegistration.prototype) as object;
    Object.assign(instance, {
        keyCreationModel,
        keyCreatePopover: new PopoverStub(),
        subtype,
        managementDefaultModel: { trustAnchorARN: null, roleARN: null, rootCA: null },
        getHYOKCertificates: () => Promise.resolve(certs),
        getText: (key: string) => key
    });
    return instance as ResetModelTarget;
}

test('maps certificates with a default view mode for AWS', async (assert) => {
    const keyCreationModel = new ModelStub();
    const target = createResetTarget(keyCreationModel, HYOKProviders.AWS, {
        hyokManagementCerts: [{ name: 'mgmt' }],
        cryptoRolesCerts: [{ name: 'crypto' }]
    });
    target.resetModel();
    await Promise.resolve();
    await Promise.resolve();
    const data = keyCreationModel.getData();
    const cryptoRolesCerts = data.cryptoRolesCerts as { name: string, certViewMode: string }[];
    const managementRolesCerts = data.managementRolesCerts as { name: string, certViewMode: string }[];
    assert.strictEqual(cryptoRolesCerts[0].certViewMode, 'String', 'crypto cert gets default view mode');
    assert.strictEqual(managementRolesCerts[0].certViewMode, 'String', 'management cert gets default view mode');
    assert.ok(data.hyokAWSManagementCertObj, 'AWS provider data added');
});

test('handles empty certificate lists', async (assert) => {
    const keyCreationModel = new ModelStub();
    const target = createResetTarget(keyCreationModel, HYOKProviders.GCP, {
        hyokManagementCerts: [],
        cryptoRolesCerts: []
    });
    target.resetModel();
    await Promise.resolve();
    await Promise.resolve();
    const data = keyCreationModel.getData();
    assert.deepEqual(data.cryptoRolesCerts, [], 'empty crypto cert list handled');
    assert.deepEqual(data.managementRolesCerts, [], 'empty management cert list handled');
    assert.strictEqual(data.poolId, '', 'GCP provider data added');
});

test('adds Fortanix provider data', async (assert) => {
    const keyCreationModel = new ModelStub();
    const target = createResetTarget(keyCreationModel, HYOKProviders.FORTANIX, {
        hyokManagementCerts: [{ name: 'mgmt' }],
        cryptoRolesCerts: [{ name: 'crypto' }]
    });
    target.resetModel();
    await Promise.resolve();
    await Promise.resolve();
    const data = keyCreationModel.getData();
    assert.strictEqual(data.applicationId, '', 'Fortanix provider data added');
});
