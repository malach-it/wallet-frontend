import { DISPLAY_CONSOLE, LOG_LEVEL } from "./config";

export type LogLevel = "error" | "info" | "warn" | "debug";

export class Logger {
	level: LogLevel;
	logLevels: Array<LogLevel> = ["error", "info", "warn", "debug"];

	constructor(level: LogLevel = "info") {
		this.level = level;
	}

	setLevel(logLevel: LogLevel) {
		this.level = logLevel
	}

	error(...args) {
		if (this.logLevels.indexOf("error") > this.logLevels.indexOf(this.level))
			return;

		for (const message of args) {
			console.error(this.logPrefix("error"), message);
		}
	}

	info(...args) {
		if (this.logLevels.indexOf("info") > this.logLevels.indexOf(this.level))
			return;

		for (const message of args) {
			console.info(this.logPrefix("info"), message);
		}
	}

	warn(...args) {
		if (this.logLevels.indexOf("warn") > this.logLevels.indexOf(this.level))
			return;

		for (const message of args) {
			console.warn(this.logPrefix("warn"), message);
		}
	}

	debug(...args) {
		if (this.logLevels.indexOf("debug") > this.logLevels.indexOf(this.level))
			return;

		for (const message of args) {
			console.log(this.logPrefix("debug"), message);
		}
	}

	logPrefix(level: string) {
		if (!DISPLAY_CONSOLE) {
			return `[${level}] ${new Date().toISOString()} | `;
		}
		return `[${level}]`
	}
}

export const logger = new Logger(LOG_LEVEL || "debug")

window.logger = logger
