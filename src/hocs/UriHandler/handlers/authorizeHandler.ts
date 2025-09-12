import { type HandlerFactoryResponse } from "../resources";

export type AuthorizeHandlerFactoryConfig = {
}

export function authorizeHandlerFactory(config: AuthorizeHandlerFactoryConfig): HandlerFactoryResponse {
	return async function authorizeHandler({ authorize_url }: { authorize_url: string }) {
		window.location.href = authorize_url
	}
}
