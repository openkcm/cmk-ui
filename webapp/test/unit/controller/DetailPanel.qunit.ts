import DetailPanel from 'kms/controller/keyConfigs/detail/DetailPanel.controller';
import Enums from 'kms/common/Enums';
import { HyokCertificates } from 'kms/common/Types';
import { SegmentedButton$SelectionChangeEvent } from 'sap/m/SegmentedButton';

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

// A minimal JSONModel-like stub recording setProperty calls.
class ModelStub {
    public store: Record<string, unknown> = {};

    public setProperty(path: string, value: unknown): void {
        this.store[path] = value;
    }

    public getProperty(path: string): unknown {
        return this.store[path];
    }
}

// Minimal API stub.
class ApiStub {
    public getResponse: unknown;

    public getError: Error | null = null;

    public lastPath: string | undefined;

    public get<T>(path: string): Promise<T> {
        this.lastPath = path;
        if (this.getError) {
            return Promise.reject(this.getError);
        }
        return Promise.resolve(this.getResponse as T);
    }
}

/**
 * Create a DetailPanel instance without running the UI5 Controller constructor,
 * so we can exercise individual methods in isolation.
 */
function createPanel(overrides: Record<string, unknown> = {}): DetailPanel {
    const panel = Object.create(DetailPanel.prototype) as DetailPanel;
    const api = new ApiStub();
    const twoWayModel = new ModelStub();
    Object.assign(panel, {
        api,
        twoWayModel,
        id: 'key-1',
        keyConfigId: 'cfg-1',
        Enums,
        managementCertsCache: [],
        cryptoCertsCache: [],
        updateAddCryptoCertButtonState: () => { /* no-op for tests */ },
        ...overrides
    });
    return panel;
}

qModule('DetailPanel Controller - prototype');

test('exposes new certificate-related methods', (assert) => {
    assert.strictEqual(typeof DetailPanel.prototype.onToggleCertViewMode, 'function', 'onToggleCertViewMode exists');
});

qModule('DetailPanel Controller - findCertByName');

test('finds a certificate by name', (assert) => {
    const panel = createPanel();
    const certs = [
        { name: 'alpha' } as HyokCertificates,
        { name: 'beta' } as HyokCertificates
    ];
    const found = (panel as unknown as { findCertByName: (c: HyokCertificates[], n: string) => HyokCertificates | undefined }).findCertByName(certs, 'beta');
    assert.strictEqual(found?.name, 'beta', 'returns the matching certificate');
});

test('returns undefined when no certificate matches', (assert) => {
    const panel = createPanel();
    const certs = [{ name: 'alpha' } as HyokCertificates];
    const found = (panel as unknown as { findCertByName: (c: HyokCertificates[], n: string) => HyokCertificates | undefined }).findCertByName(certs, 'missing');
    assert.strictEqual(found, undefined, 'returns undefined for a missing name');
});

test('returns undefined for an empty list', (assert) => {
    const panel = createPanel();
    const found = (panel as unknown as { findCertByName: (c: HyokCertificates[], n: string) => HyokCertificates | undefined }).findCertByName([], 'anything');
    assert.strictEqual(found, undefined, 'returns undefined for an empty list');
});

qModule('DetailPanel Controller - loadCertificateDetails');

test('populates caches on success', async (assert) => {
    const api = new ApiStub();
    api.getResponse = {
        tenantDefault: { count: 1, value: [{ name: 'mgmt' }] },
        crypto: { count: 1, value: [{ name: 'crypto' }] }
    };
    const panel = createPanel({ api });
    await (panel as unknown as { loadCertificateDetails: () => Promise<void> }).loadCertificateDetails();
    const typed = panel as unknown as { managementCertsCache: HyokCertificates[], cryptoCertsCache: HyokCertificates[] };
    assert.strictEqual(api.lastPath, 'keyConfigurations/cfg-1/certificates', 'calls the certificates endpoint');
    assert.strictEqual(typed.managementCertsCache[0]?.name, 'mgmt', 'management cache populated');
    assert.strictEqual(typed.cryptoCertsCache[0]?.name, 'crypto', 'crypto cache populated');
});

test('defaults caches to empty arrays when response is empty', async (assert) => {
    const api = new ApiStub();
    api.getResponse = {};
    const panel = createPanel({ api, managementCertsCache: [{ name: 'stale' }], cryptoCertsCache: [{ name: 'stale' }] });
    await (panel as unknown as { loadCertificateDetails: () => Promise<void> }).loadCertificateDetails();
    const typed = panel as unknown as { managementCertsCache: HyokCertificates[], cryptoCertsCache: HyokCertificates[] };
    assert.deepEqual(typed.managementCertsCache, [], 'management cache reset to empty');
    assert.deepEqual(typed.cryptoCertsCache, [], 'crypto cache reset to empty');
});

test('resets caches to empty arrays on API error', async (assert) => {
    const api = new ApiStub();
    api.getError = new Error('boom');
    const panel = createPanel({ api, managementCertsCache: [{ name: 'stale' }], cryptoCertsCache: [{ name: 'stale' }] });
    await (panel as unknown as { loadCertificateDetails: () => Promise<void> }).loadCertificateDetails();
    const typed = panel as unknown as { managementCertsCache: HyokCertificates[], cryptoCertsCache: HyokCertificates[] };
    assert.deepEqual(typed.managementCertsCache, [], 'management cache cleared on error');
    assert.deepEqual(typed.cryptoCertsCache, [], 'crypto cache cleared on error');
});

test('uses empty keyConfigId when it is undefined', async (assert) => {
    const api = new ApiStub();
    api.getResponse = { tenantDefault: { value: [] }, crypto: { value: [] } };
    const panel = createPanel({ api, keyConfigId: undefined });
    await (panel as unknown as { loadCertificateDetails: () => Promise<void> }).loadCertificateDetails();
    assert.strictEqual(api.lastPath, 'keyConfigurations//certificates', 'falls back to empty keyConfigId');
});

qModule('DetailPanel Controller - setKeyDetailsToModel');

test('enriches management and crypto details with certificate data', (assert) => {
    const twoWayModel = new ModelStub();
    const panel = createPanel({
        twoWayModel,
        managementCertsCache: [{ name: 'mgmt-cert', subject: { CN: 'mgmt' }, rootCA: 'root-mgmt' }],
        cryptoCertsCache: [{ name: 'crypto-key', subject: { CN: 'crypto' }, rootCA: 'root-crypto' }]
    });
    const key = {
        type: Enums.KeyCreationTypes.HYOK,
        state: Enums.KeyStates.ENABLED,
        accessDetails: {
            management: { someManagement: 'x' },
            crypto: { 'crypto-key': { someCrypto: 'y' } }
        }
    };
    (panel as unknown as { setKeyDetailsToModel: (k: unknown) => void }).setKeyDetailsToModel(key);

    const mgmtArray = twoWayModel.getProperty('/selectedKey/accessDetails/managementDetailsArray') as Record<string, unknown>[];
    assert.strictEqual(mgmtArray[0].key, 'mgmt-cert', 'management entry key set');
    assert.strictEqual(mgmtArray[0].certName, 'mgmt-cert', 'management cert name enriched');
    assert.strictEqual(mgmtArray[0].rootCA, 'root-mgmt', 'management rootCA enriched');
    assert.strictEqual(mgmtArray[0].certViewMode, 'String', 'management default view mode');

    const cryptoArray = twoWayModel.getProperty('/selectedKey/accessDetails/cryptoARNsArray') as Record<string, unknown>[];
    assert.strictEqual(cryptoArray[0].key, 'crypto-key', 'crypto entry key set');
    assert.strictEqual(cryptoArray[0].certName, 'crypto-key', 'crypto cert name enriched');
    assert.strictEqual(cryptoArray[0].rootCA, 'root-crypto', 'crypto rootCA enriched');
    assert.strictEqual(cryptoArray[0].certViewMode, 'String', 'crypto default view mode');
});

test('builds a management entry for every management certificate', (assert) => {
    const twoWayModel = new ModelStub();
    const panel = createPanel({
        twoWayModel,
        managementCertsCache: [
            { name: 'mgmt-cert-1', subject: { CN: 'mgmt1' }, rootCA: 'root-mgmt-1' },
            { name: 'mgmt-cert-2', subject: { CN: 'mgmt2' }, rootCA: 'root-mgmt-2' }
        ],
        cryptoCertsCache: []
    });
    const key = {
        type: Enums.KeyCreationTypes.HYOK,
        state: Enums.KeyStates.ENABLED,
        accessDetails: {
            management: { someManagement: 'x' }
        }
    };
    (panel as unknown as { setKeyDetailsToModel: (k: unknown) => void }).setKeyDetailsToModel(key);

    const mgmtArray = twoWayModel.getProperty('/selectedKey/accessDetails/managementDetailsArray') as Record<string, unknown>[];
    assert.strictEqual(mgmtArray.length, 2, 'one management entry per certificate');
    assert.strictEqual(mgmtArray[0].certName, 'mgmt-cert-1', 'first management cert exposed');
    assert.strictEqual(mgmtArray[0].rootCA, 'root-mgmt-1', 'first management rootCA exposed');
    assert.strictEqual(mgmtArray[1].certName, 'mgmt-cert-2', 'second management cert exposed');
    assert.strictEqual(mgmtArray[1].rootCA, 'root-mgmt-2', 'second management rootCA exposed');
    assert.deepEqual(mgmtArray[1].value, { someManagement: 'x' }, 'management access details shared across entries');
});

test('handles missing certificate caches gracefully', (assert) => {
    const twoWayModel = new ModelStub();
    const panel = createPanel({ twoWayModel });
    const key = {
        type: Enums.KeyCreationTypes.HYOK,
        state: Enums.KeyStates.ENABLED,
        accessDetails: {
            management: { someManagement: 'x' },
            crypto: { 'crypto-key': { someCrypto: 'y' } }
        }
    };
    (panel as unknown as { setKeyDetailsToModel: (k: unknown) => void }).setKeyDetailsToModel(key);
    const mgmtArray = twoWayModel.getProperty('/selectedKey/accessDetails/managementDetailsArray') as Record<string, unknown>[];
    assert.strictEqual(mgmtArray[0].certName, undefined, 'management cert name undefined when no cache');
    const cryptoArray = twoWayModel.getProperty('/selectedKey/accessDetails/cryptoARNsArray') as Record<string, unknown>[];
    assert.strictEqual(cryptoArray[0].certName, undefined, 'crypto cert name undefined when no cache');
});

test('skips arrays when access details are absent', (assert) => {
    const twoWayModel = new ModelStub();
    const panel = createPanel({ twoWayModel });
    const key = { type: Enums.KeyCreationTypes.BYOK, state: Enums.KeyStates.ENABLED };
    (panel as unknown as { setKeyDetailsToModel: (k: unknown) => void }).setKeyDetailsToModel(key);
    assert.strictEqual(twoWayModel.getProperty('/selectedKey/accessDetails/managementDetailsArray'), undefined, 'no management array set');
    assert.strictEqual(twoWayModel.getProperty('/selectedKey/accessDetails/cryptoARNsArray'), undefined, 'no crypto array set');
});

qModule('DetailPanel Controller - onToggleCertViewMode');

function buildToggleEvent(path: string | undefined | null, hasContext = true): SegmentedButton$SelectionChangeEvent {
    const stub: SegmentedButtonEventStub = {
        getSource: () => ({
            getBindingContext: () => (hasContext ? { getPath: () => path ?? undefined } : undefined),
            getSelectedKey: () => 'Hex'
        })
    };
    return stub as unknown as SegmentedButton$SelectionChangeEvent;
}

test('updates the view mode for the bound path', (assert) => {
    const twoWayModel = new ModelStub();
    const panel = createPanel({ twoWayModel });
    panel.onToggleCertViewMode(buildToggleEvent('/selectedKey/accessDetails/cryptoARNsArray/0'));
    assert.strictEqual(
        twoWayModel.getProperty('/selectedKey/accessDetails/cryptoARNsArray/0/certViewMode'),
        'Hex',
        'certViewMode updated on the bound path'
    );
});

test('does nothing when there is no binding path', (assert) => {
    const twoWayModel = new ModelStub();
    const panel = createPanel({ twoWayModel });
    panel.onToggleCertViewMode(buildToggleEvent(undefined));
    assert.deepEqual(twoWayModel.store, {}, 'no property set when path missing');
});

test('does nothing when there is no binding context', (assert) => {
    const twoWayModel = new ModelStub();
    const panel = createPanel({ twoWayModel });
    panel.onToggleCertViewMode(buildToggleEvent(undefined, false));
    assert.deepEqual(twoWayModel.store, {}, 'no property set when context missing');
});

qModule('DetailPanel Controller - getKeyDetails');

interface GetKeyDetailsTarget {
    getKeyDetails: () => Promise<void>
}

/**
 * Build a DetailPanel (via the prototype, no UI5 constructor) and override its
 * collaborators with lightweight stubs so `getKeyDetails` can be exercised.
 */
function createPanelForLoad(selectedKey: unknown, overrides: Record<string, unknown> = {}): { panel: GetKeyDetailsTarget, twoWayModel: ModelStub, certsLoaded: { value: boolean } } {
    const panel = Object.create(DetailPanel.prototype) as Record<string, unknown>;
    const twoWayModel = new ModelStub();
    const oneWayModel = new ModelStub();
    const api = new ApiStub();
    api.getResponse = selectedKey;
    const certsLoaded = { value: false };
    Object.assign(panel, {
        api,
        twoWayModel,
        oneWayModel,
        id: 'key-1',
        tenantId: 'tenant-1',
        keyConfigId: 'cfg-1',
        Enums,
        managementCertsCache: [],
        cryptoCertsCache: [],
        getView: () => ({ setBusy: () => { /* no-op */ } }),
        getText: (key: string) => key,
        getRouter: () => ({ navTo: () => { /* no-op */ } }),
        loadCertificateDetails: () => {
            certsLoaded.value = true;
            return Promise.resolve();
        },
        setKeyDetailsToModel: () => { /* covered separately */ },
        updateKeyActionButtons: () => { /* no-op */ },
        updateAddCryptoCertButtonState: () => { /* no-op */ },
        ...overrides
    });
    return { panel: panel as unknown as GetKeyDetailsTarget, twoWayModel, certsLoaded };
}

test('loads certificate details for HYOK keys', async (assert) => {
    const key = { id: 'key-1', type: Enums.KeyCreationTypes.HYOK, state: Enums.KeyStates.ENABLED };
    const { panel, twoWayModel, certsLoaded } = createPanelForLoad(key);
    await panel.getKeyDetails();
    assert.ok(certsLoaded.value, 'loadCertificateDetails invoked for HYOK key');
    assert.deepEqual(twoWayModel.getProperty('/selectedKey'), key, 'selected key stored on the model');
});

test('does not load certificate details for non-HYOK keys', async (assert) => {
    const key = { id: 'key-2', type: Enums.KeyCreationTypes.SYSTEM_MANAGED, state: Enums.KeyStates.ENABLED };
    const { panel, certsLoaded } = createPanelForLoad(key);
    await panel.getKeyDetails();
    assert.notOk(certsLoaded.value, 'loadCertificateDetails not invoked for non-HYOK key');
});

test('navigates away when the key is not found', async (assert) => {
    let navigated = false;
    const { panel } = createPanelForLoad(null, {
        getRouter: () => ({ navTo: () => { navigated = true; } })
    });
    await panel.getKeyDetails();
    assert.ok(navigated, 'router navigates back when the key is missing');
});

test('swallows certificate loading errors for HYOK keys', async (assert) => {
    const key = { id: 'key-3', type: Enums.KeyCreationTypes.HYOK, state: Enums.KeyStates.ENABLED };
    const { panel, twoWayModel } = createPanelForLoad(key, {
        loadCertificateDetails: () => Promise.reject(new Error('cert boom'))
    });
    await panel.getKeyDetails();
    assert.deepEqual(twoWayModel.getProperty('/selectedKey'), key, 'continues loading despite cert error');
});

test('fetches import parameters for a BYOK key awaiting import', async (assert) => {
    const key = { id: 'key-4', type: Enums.KeyCreationTypes.BYOK, state: Enums.KeyStates.PENDING_IMPORT };
    const { panel, twoWayModel, certsLoaded } = createPanelForLoad(key);
    await panel.getKeyDetails();
    assert.notOk(certsLoaded.value, 'certificate details not loaded for BYOK keys');
    assert.deepEqual(twoWayModel.getProperty('/selectedKey'), key, 'BYOK key stored on the model');
});

test('swallows import-parameter fetch errors for BYOK keys awaiting import', async (assert) => {
    const key = { id: 'key-5', type: Enums.KeyCreationTypes.BYOK, state: Enums.KeyStates.PENDING_IMPORT };
    const api = new ApiStub();
    // Match requests by path: key + versions succeed; import-parameters rejects to trigger the catch.
    api.get = <T>(path: string): Promise<T> => {
        if (path === 'keys/key-5/versions') {
            return Promise.resolve({ value: [], count: 0 } as T);
        }
        if (path.includes('importParams')) {
            return Promise.reject(new Error('import params boom'));
        }
        // keys/key-5 (and any other) resolves to the key itself.
        return Promise.resolve(key as T);
    };
    const { panel, twoWayModel } = createPanelForLoad(key, { api });
    await panel.getKeyDetails();
    assert.deepEqual(twoWayModel.getProperty('/selectedKey'), key, 'continues despite import-parameter errors');
});

test('shows an error message when key details fail to load', async (assert) => {
    let errorShown = false;
    const api = new ApiStub();
    api.getError = new Error('key fetch boom');
    const { panel } = createPanelForLoad(null, {
        api,
        getText: (key: string) => {
            if (key === 'errorFetchingKeyDetails') {
                errorShown = true;
            }
            return key;
        }
    });
    await panel.getKeyDetails();
    assert.ok(errorShown, 'error message surfaced via getText in the catch block');
});
