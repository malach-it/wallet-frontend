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

		console.log("Handling authorization response...");
		try {
			await openID4VCI.handleAuthorizationResponse(u.toString());
		} catch(err) {
			console.log("Error during the handling of authorization response")
			window.history.replaceState({}, '', `${window.location.pathname}`);
			console.error(err)
		}
	}
}
