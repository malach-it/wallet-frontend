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

		post: async <T>(url: string, body: any) => {
			const response = await httpProxy.post(url, body);

			return {
				data: response.data as T
			};
		}
	}
}
