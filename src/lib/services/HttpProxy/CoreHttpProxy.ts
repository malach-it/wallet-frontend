import { useHttpProxy } from "./HttpProxy";

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
			const response = await httpProxy.post(url, body, config.headers);

			return {
				data: response.data as T
			};
		}
	}
}
