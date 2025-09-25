import { logger } from "@/logger";
import { type HandlerFactoryResponse } from "../resources";
import { IOpenID4VCI } from "@/lib/interfaces/IOpenID4VCI";

export type PresentationSuccessHandlerFactoryConfig = {
	url: string
	openID4VCI: IOpenID4VCI;
	setUsedAuthorizationCodes: React.Dispatch<React.SetStateAction<string[]>>;
}

export function presentationSuccessHandlerFactory(config: PresentationSuccessHandlerFactoryConfig): HandlerFactoryResponse {
	const { url, openID4VCI, setUsedAuthorizationCodes} = config;

	return async function presentationSuccessHandler({}) {
		const u = new URL(url)

		setUsedAuthorizationCodes((codes) => [...codes, u.searchParams.get('code')]);

		logger.debug("Handling authorization response...");
		try {
			await openID4VCI.handleAuthorizationResponse(u.toString());
		} catch(err) {
			logger.error("Error during the handling of authorization response", err);
			window.history.replaceState({}, '', `${window.location.pathname}`);
		}
	}
}
