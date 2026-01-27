export default class Ora {
    private static instance: Ora;
    oraConfig: object;
    constructor(oraConfig: object) {
        this.oraConfig = oraConfig;
    }

    public static init(oraConfig: object): void {
        if (!Ora.instance) {
            Ora.instance = new Ora(oraConfig);
        }
    }

    public static getInstance(): Ora {
        if (!Ora.instance) {
            throw new Error('Ora config not initialized. Call Ora.init() first.');
        }
        return Ora.instance;
    }
}
