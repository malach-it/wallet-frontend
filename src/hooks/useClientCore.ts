import { useContext } from 'react';
import { Core } from '@wwwallet-private/client-core';
import ClientCoreContext from '@/context/ClientCoreContext';

export default function useClientCore(): Core {
	return useContext(ClientCoreContext);
}
