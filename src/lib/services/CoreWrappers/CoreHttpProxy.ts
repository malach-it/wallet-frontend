import { useHttpProxy } from "../HttpProxy/HttpProxy";

export function useCoreHttpProxy() {
	const httpProxy = useHttpProxy();

	return {
		get: async <T>(url: string) => {
			const response = await httpProxy.get(url);

			return {
				data: response.data as T
			};
		},

		post: async <T>(url: string, body: any, config: any) => {
			// Figure out how this should be done, search params or object...
			const response = await httpProxy.post(url, body, config.headers);

			return {
				data: response.data as T
			};
		}
	}
}
