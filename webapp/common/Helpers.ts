import { Button$PressEvent } from 'sap/m/Button';
import MessageToast from 'sap/m/MessageToast';
import MessageBox from "sap/m/MessageBox";
import {AxiosError} from "axios";

interface ErrorResponse {
    error: {
        message: string;
        data: {
            error: {
                code: string,
                id: string,
                status: number
            };
        };
    };
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

export function setNameValueState(name: string) : { valueState: string, valueStateText: string } {
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

export function convertDateToUTC(date : Date): string {
    const dateObject = new Date(date);
    return dateObject.toISOString().split('.')[0];
}

export function getErrorCode(error: AxiosError): string {
    let errorCode : string = undefined;
    if(error.message.includes('data') && error.message.includes('code')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        errorCode = errorMessage?.error?.data?.error?.code;
    }
    return errorCode;
}

export function getErrorId(error: AxiosError): string {
    let errorId : string = undefined;
    if(error.message.includes('data') && error.message.includes('id')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        errorId = errorMessage?.error?.data?.error?.id;
    }
    return errorId;
}

export function getErrorStatus(error: AxiosError): number {
    let errorStatus = undefined;
    if(error.message.includes('data') && error.message.includes('status')) {
        const errorMessage = JSON.parse(error.message) as ErrorResponse;
        errorStatus = errorMessage?.error?.data?.error?.status;
    }
    return errorStatus;
}

export function showErrorMessage(error: AxiosError, userMessage: string): void {
    const errorId: string = getErrorId(error);
    const statusCode = getErrorStatus(error);
    const datetime = convertDateToUTC(new Date());

    if (statusCode === 500) {
        userMessage = 'An error has occurred. Please try again later or contact a system administrator and provide the following error details.';
    }

    MessageBox.error(userMessage, {
        title: "Error",
        details: "<p><strong>" + "Error Details:" + "</strong></p>" +
            "<ul>" +
            "<li><strong>" + "Error ID: " + "</strong>"+ ' ' + errorId + "</li>" +
            "<li><strong>" + "Timestamp (UTC): " + "</strong>" + datetime + "</li>" +
            "</ul>",
        styleClass: 'sapUiUserSelectable'
    });
}