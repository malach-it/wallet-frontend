import { DISPLAY_CONSOLE, LOG_LEVEL } from "./config";

export type LogLevel = "error" | "info" | "warn" | "debug";

export class Logger {
	level: LogLevel;
	logLevels: Array<LogLevel> = ["error", "info", "warn", "debug"];

	levelColors: Record<LogLevel, string> = {
		error: "#FF5C5C",
		info: "#4DA6FF",
		warn: "#FFAA00",
		debug: "#9E9E9E",
	}

	constructor(level: LogLevel = "info") {
		this.level = level;
			
		for (const [index, logLevel] of this.logLevels.entries()) {
			if (index <= this.logLevels.indexOf(this.level)) {
				this[logLevel] = Function.prototype.bind.call(
					console[logLevel],
					console,
					this.logPrefix(logLevel)
				);
			}
		}
	}

	setLevel(logLevel: LogLevel) {
		this.level = logLevel
	}

	logPrefix(level: string) {
		if (!DISPLAY_CONSOLE) {
			return `[${level}] ${new Date().toISOString()} | `;
		}
		return `[${level}]`
	
	}

	error(...args) {}
	info(...args) {}
	warn(...args) {}
	debug(...args) {}
}

export const logger = new Logger(LOG_LEVEL || "debug")

window.logger = logger
