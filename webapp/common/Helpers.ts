import { Button$PressEvent } from 'sap/m/Button';
import MessageToast from 'sap/m/MessageToast';
import MessageBox from 'sap/m/MessageBox';
import { AxiosError } from 'axios';
import Core from 'sap/ui/core/Core';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';
interface ErrorResponse {
    error: {
        message: string
        data: ErrorResponseData
    }
}
interface ErrorResponseData {
    error: {
        code: string
        context?: {
            reason?: string
        }
        message?: string
        requestID: string
        status: number
    }
}

export function getText(key: string, params?: string | string[] | number | number[]): string {
    const paramsType = typeof params;
    // The method below is deprecated but there is no acceptable alternative to set a global model, so this is needed for now
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const resourceBundle = (Core.getModel('i18n') as ResourceModel).getResourceBundle() as ResourceBundle;
    let formattedText: string | undefined = '';
    if (key && typeof key === 'string') {
        switch (paramsType) {
            case 'undefined':
                formattedText = resourceBundle.getText(key);
                break;
            case 'object':
                formattedText = Array.isArray(params) && params.length > 0 ? resourceBundle.getText(key, params) : '';
                break;
            case 'string':
            case 'number':
                formattedText = resourceBundle.getText(key, [params]);
                break;
        }
    }
    return formattedText || key;
}
export async function copyToClipboard(event: Button$PressEvent): Promise<void> {
    const textToCopy = event.getSource().data('textToCopy') as string;
    await navigator.clipboard.writeText(textToCopy);
    MessageToast.show('Copied to clipboard');
}

export function isUUIDValid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
}

export function _isNameValid(name: string): boolean {
    const nameRegex = /^.{3,}$/;
    if (!name || !nameRegex.test(name)) {
        return false;
    }
    return true;
}

export function setNameValueState(name: string): { valueState: string, valueStateText: string } {
    if (!_isNameValid(name) || !name) {
        return {
            valueState: 'Error',
            valueStateText: 'Name is required and must be at least 3 characters long'
        };
    }
    return {
        valueState: 'None',
        valueStateText: ''
    };
}

export function convertDateToUTC(date: Date): string {
    const dateObject = new Date(date);
    return dateObject.toISOString().split('.')[0];
}

export function getErrorCode(error: AxiosError): string {
    let errorCode = '';
    if (error.message.includes('data') && error.message.includes('code')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        errorCode = errorMessage?.error?.data?.error?.code;
    }
    return errorCode;
}

export function getRequestId(error: AxiosError): string {
    let errorId = '';
    if (error.message.includes('data') && error.message.includes('requestID')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        errorId = errorMessage?.error?.data?.error?.requestID;
    }
    return errorId;
}

export function getErrorStatus(error: AxiosError): number | undefined {
    let errorStatus = undefined;
    if (error.message.includes('data') && error.message.includes('status')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        errorStatus = errorMessage?.error?.data?.error?.status;
    }
    return errorStatus;
}

export function getErrorContext(error: AxiosError): { reason?: string, type?: string } | undefined {
    if (error.message.includes('data') && error.message.includes('context')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        return errorMessage?.error?.data?.error?.context;
    }
}

export function getErrorDataMessage(error: AxiosError): string | undefined {
    if (error.message.includes('data')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        return errorMessage?.error?.data?.error?.message;
    }
}

export function showErrorMessage(error: AxiosError, userMessage: string | undefined, i18nKey?: string): void {
    const requestID: string = getRequestId(error);
    const statusCode = getErrorStatus(error);
    const datetime = convertDateToUTC(new Date());
    let errorMessage = userMessage || getText(i18nKey || 'genericError');

    if (statusCode === 500) {
        errorMessage = getText('genericError');
    }

    MessageBox.error(errorMessage, {
        title: 'Error',
        details: '<p><strong>' + 'Error Details:' + '</strong></p>'
          + '<ul>'
          + '<li><strong>' + 'Request ID: ' + '</strong>' + ' ' + requestID + '</li>'
          + '<li><strong>' + 'Timestamp (UTC): ' + '</strong>' + datetime + '</li>'
          + '<li><strong>' + 'Support Page: ' + '</strong>' + "<a href='https://support.sap.com/'>https://support.sap.com<a/>" + '</li>'
          + '</ul>',
        styleClass: 'sapUiUserSelectable'
    });
}
