import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
interface TenantsResponse {
    value: { id: string, name?: string }[]
    count: number
}
/**
 * @namespace kms
 */
export default class Api {
    private static instance: Api;
    private readonly axiosInstance: AxiosInstance;
    private readonly setAxiosHeaderContentType: (contentType: string) => void;
    private readonly defaultContentType: string = 'application/json';
    private readonly mergePatchContentType: string = 'application/merge-patch+json';
    private baseURL: string;
    private tenants: TenantsResponse | undefined;
    private tenantId: string | undefined;
    private tenantName: string | undefined;

    constructor(baseUrl: string) {
        this.baseURL = baseUrl;
        this.axiosInstance = axios.create({
            baseURL: `${this.baseURL}/cmk/v1`,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        this.setAxiosHeaderContentType = (contentType) => {
            this.axiosInstance.defaults.headers['Content-Type'] = contentType;
        };
    }

    public static async init(baseUrl: string): Promise<void> {
        if (!Api.instance) {
            Api.instance = new Api(baseUrl);
            await Api.instance.getAndSetTenants();
        }
    }

    public static getInstance(): Api {
        if (!Api.instance) {
            throw new Error('API not initialized. Call Api.init() first.');
        }
        return Api.instance;
    }

    public static updateTenantId(tenantId: string): void {
        if (!Api.instance) {
            throw new Error('API not initialized. Call Api.init() first.');
        }
        const tenants = Api.instance.tenants?.value || [];
        const tenantExists = tenants.some(tenant => tenant.id === tenantId);
        if (!tenantExists) {
            throw new Error(`Tenant with id ${tenantId} does not exist.`);
        }
        Api.instance.axiosInstance.defaults.baseURL = `${Api.instance.baseURL}/cmk/v1/${tenantId}`;
    }

    private async getAndSetTenants(): Promise<void> {
        const tenantsResponse = await this.get<TenantsResponse>('sys/tenants', { $top: 1024, $skip: 0 });
        this.tenants = tenantsResponse?.value ? tenantsResponse : undefined;
        if (this.tenants && this.tenants.value.length > 0) {
            Api.instance.setTenantId(this.tenants.value[0].id);
            Api.instance.setTenantName(this.tenants.value[0].name || '');
        }
        else {
            throw new Error('No tenants found');
        }
    }

    public getTenantsList() {
        return this.tenants?.value;
    }

    public getTenantName(): string | undefined {
        return this.tenantName;
    }

    public setTenantName(name: string): void {
        this.tenantName = name;
    }

    public setTenantId(tenantId: string): void {
        this.tenantId = tenantId;
        Api.updateTenantId(tenantId);
    }

    public getTenantId(): string | undefined {
        return this.tenantId;
    }

    public async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, { params: { ...params, $count: true } });
            return response.data;
        }
        catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError?.status,
                message: apiError?.statusText
            }));
        }
    }

    public async post<R>(endpoint: string, data: unknown): Promise<R> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.post(endpoint, data);
            return response.data;
        }
        catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError?.status,
                message: apiError?.statusText
            }));
        }
    }

    public async put<R>(endpoint: string, data: unknown): Promise<R> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.put(endpoint, data);
            return response.data;
        }
        catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError?.status,
                message: apiError?.statusText
            }));
        }
    }

    public async patch<R>(endpoint: string, data: unknown): Promise<R> {
        this.setAxiosHeaderContentType(this.mergePatchContentType);
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.patch(endpoint, data);
            return response.data;
        }
        catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError?.status,
                message: apiError?.statusText
            }));
        }
    }

    public async delete<T>(endpoint: string): Promise<T> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint);
            return response.data;
        }
        catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError?.status,
                message: apiError?.statusText
            }));
        }
    }
}
