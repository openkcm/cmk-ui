import { loadConfig, loadYAMLConfig, getConfig } from 'kms/utils/Config';
import { Config } from 'kms/common/Types';

// Config caches its results in module-level state with no reset hook, so every stub
// here returns the SAME payload. That keeps assertions valid no matter which test
// populates the cache first (QUnit may reorder tests).
const STUB_CONFIG: Config = { apiBaseUrl: 'https://api.example.test', bisEnvironment: 'test' };
const STUB_YAML = 'apiBaseUrl: https://api.example.test\n';

type FetchFn = typeof globalThis.fetch;

QUnit.module('Config Unit Tests', {
    beforeEach: function (this: { originalFetch: FetchFn }) {
        this.originalFetch = globalThis.fetch;
        globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
            // Config only ever fetches string paths, so treat the input as a string directly.
            const url = input as string;
            const body = url.endsWith('.yaml')
                ? { ok: true, text: () => Promise.resolve(STUB_YAML) }
                : { ok: true, json: () => Promise.resolve(STUB_CONFIG) };
            return Promise.resolve(body as unknown as Response);
        };
    },
    afterEach: function (this: { originalFetch: FetchFn }) {
        globalThis.fetch = this.originalFetch;
    }
});

QUnit.test('loadConfig resolves to the parsed JSON config', async function (assert) {
    const config = await loadConfig();
    assert.strictEqual(config.apiBaseUrl, STUB_CONFIG.apiBaseUrl, 'apiBaseUrl is parsed from the response');
    assert.strictEqual(config.bisEnvironment, STUB_CONFIG.bisEnvironment, 'bisEnvironment is parsed from the response');
});

QUnit.test('loadConfig returns a stable cached object on repeated calls', async function (assert) {
    const first = await loadConfig();
    const second = await loadConfig();
    assert.strictEqual(first, second, 'the same cached object is returned');
});

QUnit.test('getConfig returns the config once it has been loaded', async function (assert) {
    await loadConfig();
    const config = getConfig();
    assert.strictEqual(config.apiBaseUrl, STUB_CONFIG.apiBaseUrl, 'getConfig exposes the loaded config synchronously');
});

QUnit.test('loadYAMLConfig resolves to the raw YAML text', async function (assert) {
    const yaml = await loadYAMLConfig();
    assert.strictEqual(yaml, STUB_YAML, 'the raw YAML text is returned');
});
