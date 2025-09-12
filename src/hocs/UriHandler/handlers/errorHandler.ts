import { type HandlerFactoryResponse } from "../resources";

export type ErrorHandlerFactoryConfig = {
	url: string
	isLoggedIn: boolean;
	setMessagePopup: React.Dispatch<React.SetStateAction<boolean>>
	setTypeMessagePopup: React.Dispatch<React.SetStateAction<string>>
	setTextMessagePopup: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
	}>>;
}

export function errorHandlerFactory(config: ErrorHandlerFactoryConfig): HandlerFactoryResponse {
	const { url, isLoggedIn, setMessagePopup, setTypeMessagePopup, setTextMessagePopup } = config;

	return async function errorHandler({}) {
		const urlParams = new URLSearchParams(window.location.search);
		const state = urlParams.get('state');
		const error = urlParams.get('error');

		if (url && isLoggedIn && state && error) {
			window.history.replaceState({}, '', `${window.location.pathname}`);
			const errorDescription = urlParams.get('error_description');
			setTextMessagePopup({ title: error, description: errorDescription });
			setTypeMessagePopup('error');
			setMessagePopup(true);
		}
	}
}
