declare global {
    namespace NodeJS {
        interface ProcessEnv {
            AUTOMATION_BASE_URL: string;
        }
    }
}

export { };