import { Core } from "@wwwallet-private/client-core";

export type LocationProtocolResponse = Exclude<Awaited<ReturnType<InstanceType<typeof Core>['location']>>, { protocol: null }>;

export type HandlerFactoryResponse = (this: StepHandlers, data: LocationProtocolResponse['data']|{}) => Promise<void>;

export type StepHandlerID = "presentation" | "presentation_success" | "credential_request" | "protocol_error"

export type StepHandlers = Record<StepHandlerID, HandlerFactoryResponse>;
