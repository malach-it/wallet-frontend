import { HandlerHook, HandlerHookConfig } from "../resources";

export function useAuthorizeHandler(config: HandlerHookConfig): HandlerHook {
	return async function authorizeHandler({ authorize_url }: { authorize_url: string }) {
		window.location.href = authorize_url
	}
}
