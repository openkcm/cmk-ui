import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import Auth from './Auth.service';
import ForbiddenStateService from '../utils/ForbiddenState';
import type { TenantsResponse, UserData } from 'kms/common/Types';
import { getErrorCode } from 'kms/common/Helpers';
import Constants from 'kms/common/Constants';

// Custom error class for API errors that should be shown on splash screen
export class ApiAccessError extends Error {
    public readonly errorCode: string;
    constructor(message: string, errorCode: string) {
        super(message);
        this.name = 'ApiAccessError';
        this.errorCode = errorCode;
    }
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
    private userInfo: UserData | undefined;
    private static setAxiosHeaderCSRFCookie: (tenantID: string) => void;
    private hasHandledFirstAuthError = false;
    private isLoginInProgress = false;

    constructor(baseUrl: string) {
        this.baseURL = baseUrl;
        this.axiosInstance = axios.create({
            baseURL: `${this.baseURL}/cmk/v1`,
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });
        this.setAxiosHeaderContentType = (contentType) => {
            this.axiosInstance.defaults.headers['Content-Type'] = contentType;
        };
        Api.setAxiosHeaderCSRFCookie = (tenantId: string) => {
            this.axiosInstance.defaults.headers['X-CSRF-Token'] = Auth.getCsrfTokenFromCookie(tenantId);
        };
    }

    public static init(baseUrl: string): void {
        if (!Api.instance) {
            Api.instance = new Api(baseUrl);
        }
    }

    private handleError(error: unknown): void {
        const axiosError = error as AxiosError;
        const apiError = axiosError.response;
        const isAuthenticationError = apiError?.status === 401;
        const isForbiddenError = apiError?.status === 403;
        if (isAuthenticationError) {
            console.warn('Authentication error detected. Initiating login process.');
            try {
                Auth.handle401Error(this.tenantId || '');
            }
            catch (e: unknown) {
                console.error('Login initiation failed:', e);
                ForbiddenStateService.getInstance().setForbiddenState(Constants.FORBIDDEN_ERROR_CODES.AUTHENTICATION_FAILED);
            }
            // If forbidden state was set (e.g. max login attempts or the catch block for handle401Error), throw so callers can handle it
            if (ForbiddenStateService.getInstance().isForbidden()) {
                const forbiddenService = ForbiddenStateService.getInstance();
                throw new ApiAccessError(
                    forbiddenService.getForbiddenErrorMessage(),
                    forbiddenService.getForbiddenErrorCode()
                );
            }
            // Otherwise, a login redirect was initiated — just return
            return;
        }
        else if (isForbiddenError) {
            const e = new Error(JSON.stringify({
                error: apiError,
                status: apiError?.status,
                message: apiError?.statusText
            }));
            this.handleForbiddenError(e as AxiosError);
        }
        else {
            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError?.status,
                message: apiError?.statusText
            }));
        }
    }

    private handleForbiddenError(error: AxiosError): void {
        const errorCode = getErrorCode(error);
        const forbiddenService = ForbiddenStateService.getInstance();
        forbiddenService.setForbiddenState(errorCode);

        throw new ApiAccessError(
            forbiddenService.getForbiddenErrorMessage(),
            forbiddenService.getForbiddenErrorCode()
        );
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
        Api.instance.axiosInstance.defaults.baseURL = `${Api.instance.baseURL}/cmk/v1/${tenantId}`;
        Api.setAxiosHeaderCSRFCookie(tenantId);
        Api.instance.tenantId = tenantId;
    }

    public async getTenantsForTenant(): Promise<TenantsResponse | undefined> {
        try {
            const response = await this.get<TenantsResponse>('tenants', { $top: 1024, $skip: 0 });
            this.tenants = response?.value ? response : undefined;
            return response;
        }
        catch (error) {
            console.error('Error fetching tenants:', error);
            throw error;
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

    public setUserInfo(userInfo: UserData): void {
        this.userInfo = userInfo;
    }

    public getUserInfo(): UserData | undefined {
        return this.userInfo;
    }

    public async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T | undefined> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, { params: { ...params, $count: true } });
            return response.data;
        }
        catch (error) {
            this.handleError(error);
        }
    }

    public async post<R>(endpoint: string, data: unknown): Promise<R | undefined> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.post(endpoint, data);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
        }
    }

    public async put<R>(endpoint: string, data: unknown): Promise<R | undefined> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.put(endpoint, data);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
        }
    }

    public async patch<R>(endpoint: string, data: unknown): Promise<R | undefined> {
        this.setAxiosHeaderContentType(this.mergePatchContentType);
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.patch(endpoint, data);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
        }
    }

    public async delete<T>(endpoint: string): Promise<T | undefined> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint);
            return response.data;
        }
        catch (error) {
            this.handleError(error);
        }
    }
}
