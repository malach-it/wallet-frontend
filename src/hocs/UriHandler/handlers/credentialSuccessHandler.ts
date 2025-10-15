import { useNavigate } from "react-router-dom";
import { HandlerHook, HandlerHookConfig } from "../resources";

export function useCredentialSuccessHandler(config: HandlerHookConfig): HandlerHook {
	const navigate = useNavigate()

	return async function credentialSuccessHandler() {
		navigate("/");
	}
}
