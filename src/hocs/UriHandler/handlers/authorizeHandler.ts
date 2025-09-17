import { type HandlerFactoryResponse } from "../resources";

export type AuthorizeHandlerFactoryConfig = {
}

export function authorizeHandlerFactory(config: AuthorizeHandlerFactoryConfig): HandlerFactoryResponse {
	return async function authorizeHandler({ authorize_url }: { authorize_url: string }) {
		alert(authorize_url)

		window.location.href = authorize_url
	}
}
