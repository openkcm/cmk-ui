// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class SplashScreen {
    private static readonly SPLASH_ID = 'kms-splash-screen';
    private static readonly CONTAINER_ID = 'container';
    private static readonly FADE_DURATION = 300; // ms
    private static readonly ERROR_CLASS = 'splash-error';

    public static updateStatus(text: string): void {
        const splash = document.getElementById(this.SPLASH_ID);
        if (splash) {
            const subtitle = splash.querySelector('.splash-subtitle');
            if (subtitle) {
                subtitle.textContent = text;
            }
        }
    }

    public static hide(): void {
        const splash = document.getElementById(this.SPLASH_ID);
        const container = document.getElementById(this.CONTAINER_ID);
        if (container) {
            container.removeAttribute('data-loading');
        }

        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.remove();
                const styles = document.getElementById('kms-splash-styles');
                if (styles) {
                    styles.remove();
                }
            }, this.FADE_DURATION);
        }
    }

    public static showError(message: string): void {
        const splash = document.getElementById(this.SPLASH_ID);
        if (splash) {
            splash.classList.add(this.ERROR_CLASS);
            splash.setAttribute('aria-label', 'Application error');
            splash.setAttribute('aria-live', 'assertive');
            const subtitle = splash.querySelector('.splash-subtitle');
            if (subtitle) {
                subtitle.textContent = message;
            }
            const title = splash.querySelector('.splash-title');
            if (title) {
                title.textContent = 'Error';
            }
        }
    }
}
