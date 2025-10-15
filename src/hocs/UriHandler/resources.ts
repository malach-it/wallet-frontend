import { Core } from "@wwwallet-private/client-core";

export type LocationProtocolResponse = Exclude<Awaited<ReturnType<InstanceType<typeof Core>['location']>>, { protocol: null }>;

export type StepHandlers = Record<ProtocolStep, HandlerHook>;

export type HandlerHook = (data: LocationProtocolResponse['data']|{}) => Promise<void>;

export type HandlerHookConfig = { goToStep: (step: ProtocolStep, data: ProtocolData) => void; data: ProtocolData; };

export type ProtocolData = LocationProtocolResponse['data']

export type ProtocolStep =
	| "authorization_request"
	| "authorize"
	| "presentation"
	| "presentation_success"
	| "protocol_error"
	| "credential_request"
	| "credential_success"
	| "protocol_error"
