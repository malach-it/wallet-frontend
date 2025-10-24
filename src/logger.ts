import { DISPLAY_CONSOLE, LOG_LEVEL } from "./config";

export type LogLevel = "error" | "info" | "warn" | "debug";

/**
 * Helper function that translates a json array or object into human
 * readable plain text for logger.
 */
export function jsonToLog(json: any): string {
	let indt = (i: number) => " ".repeat(i);

	const parse = (input: any, indent: number = 4) => {
		if (input === null || typeof input !== "object") {
			return String(input).trim();
		}

		if (Array.isArray(input)) {
			return input
				.map(item => `${indt(indent)}- ${parse(item, indent + 4)}`)
				.join('\n');
		}

		return Object.entries(input)
			.map(([key, value]) => {
				if (Array.isArray(value)) {
					return `${indt(indent)}${key}:\n` +
						value
							.map(item => `${indt(indent + 4)}- ${parse(item, indent + 8)}`)
							.join('\n');
				}

				if (value && typeof value === "object") {
					return `${indt(indent)}${key}:\n${parse(value, indent + 4)}`;
				}

				return `${indt(indent)}${key}: ${String(value).trim()}`;
			})
			.join('\n');
	};

	return `\n\n${parse(json)}`
}

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
				this.group[logLevel] = Function.prototype.bind.call(
					console.group, 
					console, 
					...this.logPrefix(logLevel),
				);

				this[logLevel] = Function.prototype.bind.call(
					console[logLevel],
					console,
					...this.logPrefix(logLevel)
				);
			}
		}
	}

	setLevel(logLevel: LogLevel) {
		this.level = logLevel
	}

	logPrefix(level: string) {
		let prefix = `%c[${level}]%c`;
		
		if (!DISPLAY_CONSOLE) {
			prefix += ` ${new Date().toISOString()} | `;
		}
		return [prefix, `color: ${this.levelColors[level]}; font-weight: bold;`, ""];
	}

	group: Record<LogLevel & "end", (...args) => void> = {
		end() { console.groupEnd() }
	};

	error(...args) {}
	info(...args) {}
	warn(...args) {}
	debug(...args) {}
}

export const logger = new Logger(LOG_LEVEL || "debug")

window.logger = logger
