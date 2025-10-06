import { NavigateFunction } from "react-router-dom";
import { type HandlerFactoryResponse } from "../resources";

export type CredentialSuccessHandlerFactoryConfig = {
	navigate: NavigateFunction
}

export function credentialSuccessHandlerFactory(config: CredentialSuccessHandlerFactoryConfig): HandlerFactoryResponse {
	return async function credentialSuccessHandler() {
		config.navigate("/");
	}
}
