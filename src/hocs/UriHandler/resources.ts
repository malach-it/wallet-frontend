import { Core } from "@wwwallet-private/client-core";

export type LocationProtocolResponse = Exclude<Awaited<ReturnType<InstanceType<typeof Core>['location']>>, { protocol: null }>;

export type HandlerFactoryResponse = (this: StepHandlers, data: LocationProtocolResponse['data']|{}) => Promise<void>;

export type StepHandlerID = "authorization_request" | "authorize" | "presentation" | "presentation_success" | "credential_request" | "credential_success" | "protocol_error"

export type StepHandlers = Record<StepHandlerID, HandlerFactoryResponse>;
