import { createContext } from 'react';
import { Core } from "@wwwallet-private/client-core";

const ClientCoreContext = createContext<Core|null>(null);

export default ClientCoreContext;
