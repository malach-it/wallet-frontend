import { Logger } from "./logger";

declare module '*.png' {
	const value: string;
	export = value;
}

declare global {
	interface Window { logger: Logger; }
}