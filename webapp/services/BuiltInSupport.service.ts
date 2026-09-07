/**
 * Configuration for initializing Built-in Support.
 */
export interface BISInitConfig {
    tenantId: string
    tenantName: string
    targetEnvironment: 'test' | 'live'
}

/**
 * Built-in Support Service.
 *
 * Provides the integration points for an optional built-in support feature.
 * In this build the service is a no-op: all methods are inert and no support
 * UI or SDK is loaded. The public interface is intentionally stable so that
 * callers (Component.ts, App.controller.ts) can invoke it unconditionally.
 *
 * @namespace kms.services
 */
export default class BuiltInSupportService {
    private static instance: BuiltInSupportService;

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): BuiltInSupportService {
        if (!BuiltInSupportService.instance) {
            BuiltInSupportService.instance = new BuiltInSupportService();
        }
        return BuiltInSupportService.instance;
    }

    /**
     * Initializes built-in support. No-op in this build.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public initialize(config: BISInitConfig): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Updates the support application context. No-op in this build.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public updateApplicationContext(routeName: string): void {
        // Intentionally empty
    }

    /**
     * Updates the support system context. No-op in this build.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public updateSystemContext(tenantId: string, tenantName: string): void {
        // Intentionally empty
    }

    /**
     * Syncs the current theme with built-in support. No-op in this build.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public updateTheme(theme: string): void {
        // Intentionally empty
    }

    /**
     * Tears down built-in support and releases resources. No-op in this build.
     */
    public teardown(): void {
        // Intentionally empty
    }

    /**
     * Returns whether built-in support is active. Always false in this build.
     */
    public isReady(): boolean {
        return false;
    }
}
