import Theming from 'sap/ui/core/Theming';

/**
 * Minimal interface for the BIS SDK methods used by this service.
 * The actual SDK is loaded dynamically to avoid breaking the test runner.
 */
interface BisSDKInstance {
    create: (configs: Record<string, unknown>) => void
    destroy: () => void
    isInitialized: () => boolean
    refreshContext: (getOverrideContext: () => Promise<Record<string, unknown>>) => Promise<void>
}

/**
 * Configuration for initializing Built-in Support
 */
export interface BISInitConfig {
    tenantId: string
    tenantName: string
    targetEnvironment: 'test' | 'live'
}

/**
 * Built-in Support Service
 *
 * Integrates SAP Built-in Support (BIS) SDK into the application.
 * Provides a floating support icon that gives users access to contextual help,
 * expert chat, and incident creation directly within the application.
 *
 * The SDK is loaded asynchronously via getSDK() which returns the SDK module.
 *
 * @see https://docs.example/built-in-support
 * @namespace kms.services
 */
export default class BuiltInSupportService {
    private static instance: BuiltInSupportService;
    private sdk: BisSDKInstance | null = null;
    private initialized = false;
    private currentTenantId = '';
    private currentTenantName = '';

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
     * Initialize the Built-in Support SDK.
     * Should be called once after successful app initialization (user authenticated, tenant resolved).
     *
     * IMPORTANT: Built-In Support is NOT supported in China data centers, SAP NS2, or Sovereign Cloud.
     */
    public async initialize(config: BISInitConfig): Promise<void> {
        if (this.initialized) {
            console.warn('BIS: Already initialized. Skipping duplicate initialization.');
            return;
        }

        // Guard: Don't initialize in restricted regions (China, NS2, Sovereign Cloud)
        if (this.isRestrictedRegion()) {
            console.log('BIS: Skipping initialization — restricted region detected.');
            return;
        }

        this.currentTenantId = config.tenantId;
        this.currentTenantName = config.tenantName;

        try {
            // Dynamic import to avoid breaking the test runner (which can't resolve npm packages statically)
            const bisModule = await import('built-in-support-sdk') as unknown as { getSDK: () => Promise<BisSDKInstance> };
            this.sdk = await bisModule.getSDK();

            this.sdk.create({
                // Environment configuration
                targetEnvironment: config.targetEnvironment,

                // UI configuration — floating support icon
                useIcon: true,
                zIndex: 1000,

                // Product Context — identifies the product (static)
                getProductContext: () => ({
                    productName: 'Key Management Service',
                    helpPortalProductID: 'Key_Management_Service',
                    leadingPPMSID: '00000000000000000000',
                    PPMSIDs: ['00000000000000000000'],
                    productFallbackACH: '',
                    productSupportACH: 'CMK',
                    theme: Theming.getTheme(),
                    language: navigator.language.split('-')[0].toUpperCase()
                }),

                // System Context — identifies the tenant/landscape (per deployment)
                getSystemContext: () => ({
                    systemRole: 'KMS',
                    tenantID: this.currentTenantId,
                    tenantName: this.currentTenantName,
                    systemURL: window.location.host
                }),

                // Application Context — current page/view (changes on navigation)
                getApplicationContext: () => ({
                    applicationName: 'Key Management Service',
                    achComponent: 'CMK',
                    appUrl: window.location.hash
                }),

                // Lifecycle hooks
                created: () => {
                    this.initialized = true;
                    console.log('BIS: Built-in Support SDK initialized successfully.');
                },
                onOpen: () => {
                    console.log('BIS: Support panel opened.');
                },
                onClose: () => {
                    console.log('BIS: Support panel closed.');
                }
            });
        }
        catch (error) {
            console.error('BIS: Failed to initialize Built-in Support SDK:', error);
        }
    }

    /**
     * Update the application context when the user navigates to a different page.
     * Call this on every route change.
     */
    public updateApplicationContext(routeName: string): void {
        if (!this.initialized || !this.sdk) {
            return;
        }

        void this.sdk.refreshContext(() => Promise.resolve({
            appUrl: window.location.hash,
            applicationName: this.getPageName(routeName)
        }));
    }

    /**
     * Update the system context when the user switches tenants.
     * Call this when the tenant selection changes.
     */
    public updateSystemContext(tenantId: string, tenantName: string): void {
        if (!this.initialized || !this.sdk) {
            return;
        }

        this.currentTenantId = tenantId;
        this.currentTenantName = tenantName;

        void this.sdk.refreshContext(() => Promise.resolve({
            tenantID: tenantId,
            tenantName: tenantName,
            systemURL: window.location.host
        }));
    }

    /**
     * Update the theme in BIS when the user changes the application theme.
     */
    public updateTheme(theme: string): void {
        if (!this.initialized || !this.sdk) {
            return;
        }

        void this.sdk.refreshContext(() => Promise.resolve({
            theme
        }));
    }

    /**
     * Destroy the BIS SDK instance.
     * Call this on user logout to clean up resources.
     */
    public teardown(): void {
        if (this.initialized && this.sdk) {
            try {
                this.sdk.destroy();
                this.initialized = false;
                this.sdk = null;
                console.log('BIS: Built-in Support SDK destroyed.');
            }
            catch (error) {
                console.error('BIS: Error during teardown:', error);
            }
        }
    }

    /**
     * Check if the SDK is currently initialized.
     */
    public isReady(): boolean {
        return this.initialized && this.sdk?.isInitialized() === true;
    }

    /**
     * Check if the current deployment is in a restricted region where BIS is not supported.
     * Built-In Support is NOT supported in:
     * - China data centers
     * - SAP NS2
     * - Sovereign Cloud
     */
    private isRestrictedRegion(): boolean {
        const hostname = window.location.hostname.toLowerCase();
        return hostname.includes('.cn.')
            || hostname.includes('.china.')
            || hostname.includes('ns2.')
            || hostname.includes('sovereign');
    }

    /**
     * Map route names to human-readable page names for BIS application context.
     */
    private getPageName(routeName: string): string {
        const pageNames: Record<string, string> = {
            keyConfigs: 'Key Configurations',
            keyConfigDetail: 'Key Configuration Details',
            keyConfigDetailPanel: 'Key Configuration Details',
            systems: 'Systems',
            systemsDetail: 'System Details',
            tasks: 'Tasks',
            tasksDetail: 'Task Details',
            groups: 'User Groups',
            groupDetail: 'User Group Details',
            settings: 'Settings',
            forbidden: 'Access Denied'
        };
        return pageNames[routeName] || 'Key Management Service';
    }
}