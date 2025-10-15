import { logger } from "@/logger";
import { HandlerHook, HandlerHookConfig } from "../resources";
import { useCallback, useContext } from "react";
import OpenID4VCIContext from "@/context/OpenID4VCIContext";

type Config = HandlerHookConfig & {
	setUsedAuthorizationCodes: React.Dispatch<React.SetStateAction<string[]>>;
}

export function usePresentationSuccessHandler({ goToStep, data, setUsedAuthorizationCodes }: Config): HandlerHook {
	const url = window.location.toString();
	const { openID4VCI } = useContext(OpenID4VCIContext);

	return useCallback(async () =>  {
		const u = new URL(url)

		setUsedAuthorizationCodes((codes) => [...codes, u.searchParams.get('code')]);

		logger.debug("Handling authorization response...");
		try {
			await openID4VCI.handleAuthorizationResponse(u.toString());
		} catch(err) {
			logger.error("Error during the handling of authorization response", err);
			window.history.replaceState({}, '', `${window.location.pathname}`);
		}
	}, [openID4VCI, setUsedAuthorizationCodes]);
}
