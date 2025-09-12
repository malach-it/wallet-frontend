import { Core } from "@wwwallet-private/client-core";

export type StepHandlerID = "pushed_authorization_request" | "authorize" | "presentation" | "presentation_success" | "protocol_error"

export type StepHandlers = Record<StepHandlerID, (this: StepHandlers, config: {}) => void>;

export type LocationProtocolResponse = Exclude<Awaited<ReturnType<InstanceType<typeof Core>['location']>>, { protocol: null }>;

export type HandlerFactoryResponse = (this: StepHandlers, data: LocationProtocolResponse['data']|{}) => Promise<void>;
