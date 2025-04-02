import { test as setup } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'playwright.env') });

const url = process.env.AUTOMATION_BASE_URL;

setup('Check environment variables', async ({ page }) => {
    if (!url) {
        throw new Error('AUTOMATION_BASE_URL is not defined in the environment variables.');
    }
    await page.goto(url);
});