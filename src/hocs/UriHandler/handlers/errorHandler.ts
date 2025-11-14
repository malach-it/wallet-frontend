import { DisplayErrorFunction } from "@/context/ErrorDialogContext";

export type ErrorHandlerFactoryConfig = {
	url: string
	isLoggedIn: boolean;
	displayError: DisplayErrorFunction;
}

export function errorHandlerFactory(config: ErrorHandlerFactoryConfig): HandlerFactoryResponse {
	const { url, isLoggedIn, displayError } = config;

	return async function errorHandler() {
		const urlParams = new URLSearchParams(window.location.search);
		const state = urlParams.get('state');
		const error = urlParams.get('error');

		if (url && isLoggedIn && state && error) {
			window.history.replaceState({}, '', `${window.location.pathname}`);
			const errorDescription = urlParams.get('error_description');
			displayError({ title: error, description: errorDescription })
		}
	}
}
