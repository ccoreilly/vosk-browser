export class Logger {
    private logLevel = 0;

    constructor(logLevel = 0) {
        this.setLogLevel(logLevel);
    }

    public getLogLevel(): number {
        return this.logLevel;
    }

    public setLogLevel(level: number) {
        if (typeof level != "number") return;
        this.logLevel = level;
    }

    public error(message: string) {
        console.error(message)
    }

    public warn(message: string) {
        if (this.logLevel < -1) return;
        console.warn(message)
    }

    public info(message: string) {
        if (this.logLevel < 0) return;
        console.info(message)
    }

    public verbose(message: string) {
        if (this.logLevel < 1) return;
        console.debug(message)
    }

    public debug(message: string) {
        if (this.logLevel < 3) return;
        console.debug(message)
    }
}