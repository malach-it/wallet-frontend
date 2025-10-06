import { assert, describe, it } from "vitest";
import { findDivergencePoint, WalletSessionEvent, WalletStateContainer, WalletStateOperations } from "./WalletStateOperations";
import { WalletStateUtils } from "./WalletStateUtils";

describe("The WalletStateOperations", () => {
	it("should successfully apply 'new_credential' events on empty baseState", async () => {
		let container: WalletStateContainer = WalletStateOperations.initialWalletStateContainer();
		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 1>",
				format: "mso_mdoc",
				kid: "",
			}
		);


		const s1 = WalletStateOperations.walletStateReducer(container.S, container.events[0]);

		assert(s1.credentials[0].data === "<credential 1>");
		assert(await WalletStateOperations.eventHistoryIsConsistent(container))

		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 2>",
				format: "mso_mdoc",
				kid: "",
			}
		);

		container.S = WalletStateOperations.walletStateReducer(s1, container.events[1]);
		assert(container.S.credentials[1].data === "<credential 2>");
	});

	it("should successfully apply 'delete_credential' event on a baseState that includes credentials", async () => {
		let container: WalletStateContainer = WalletStateOperations.initialWalletStateContainer();

		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 1>",
				format: "mso_mdoc",
				kid: "",
			}
		);


		container.S = WalletStateOperations.walletStateReducer(container.S, container.events[0]);

		container = await WalletStateOperations.addDeleteCredentialEvent(
			container,
			{
				credentialId: (container.events[0] as any).credentialId,
			}
		)

		container.S = WalletStateOperations.walletStateReducer(container.S, container.events[1]);
		assert(container.S.credentials.length === 0);
	});

	it("should successfully find the correct point of divergence between two event histories and merge them", async () => {
		let container: WalletStateContainer = WalletStateOperations.initialWalletStateContainer();

		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 1>",
				format: "mso_mdoc",
				kid: "",
			}
		);


		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 2>",
				format: "mso_mdoc",
				kid: "",
			}
		);



		container = await WalletStateOperations.addDeleteCredentialEvent(
			container,
			{
				credentialId: (container.events[0] as any).credentialId
			},
		);




		let container1: WalletStateContainer = JSON.parse(JSON.stringify(container));


		container1 = await WalletStateOperations.addNewCredentialEvent(
			container1,
			{
				data: "<credential session1-a>",
				format: "mso_mdoc",
				kid: "",
			}
		);



		container1 = await WalletStateOperations.addNewCredentialEvent(
			container1,
			{
				data: "<credential session1-b>",
				format: "mso_mdoc",
				kid: "",
			}
		);


		let container2: WalletStateContainer = JSON.parse(JSON.stringify(container));


		container2 = await WalletStateOperations.addDeleteCredentialEvent(
			container2,
			{
				credentialId: (container2.events[1] as any).credentialId,
			},
		);


		container2 = await WalletStateOperations.addNewCredentialEvent(
			container2,
			{
				data: "<credential session2-x>",
				format: "mso_mdoc",
				kid: "",
			}
		);


		container2 = await WalletStateOperations.addNewCredentialEvent(
			container2,
			{
				data: "<credential session2-y>",
				format: "mso_mdoc",
				kid: "",
			}
		);

		const result = findDivergencePoint(container1.events, container2.events);
		// verify that E3 is the actual point of divergence
		assert(await WalletStateUtils.calculateEventHash(result) === await WalletStateUtils.calculateEventHash(container.events[2]));
		await WalletStateOperations.mergeEventHistories(container1, container2);
	});

	it("should successfully fold one event at a time", async () => {
		let container: WalletStateContainer = WalletStateOperations.initialWalletStateContainer();

		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 1>",
				format: "mso_mdoc",
				kid: "",
			}
		);


		const e1Hash = await WalletStateUtils.calculateEventHash(container.events[0]);

		container = await WalletStateOperations.foldOldEventsIntoBaseState(container, -1);

		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 2>",
				format: "mso_mdoc",
				kid: "",
			}
		);

		const e2Hash = await WalletStateUtils.calculateEventHash(container.events[0]);


		assert(container.lastEventHash === e1Hash);
		container = await WalletStateOperations.foldOldEventsIntoBaseState(container, -1);
		assert(container.lastEventHash === e2Hash);


	});


	it("should successfully fold both events at once", async () => {
		let container: WalletStateContainer = WalletStateOperations.initialWalletStateContainer();

		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 1>",
				format: "mso_mdoc",
				kid: "",
			}
		);


		container = await WalletStateOperations.addNewCredentialEvent(
			container,
			{
				data: "<credential 2>",
				format: "mso_mdoc",
				kid: "",
			}
		);

		const e2Hash = await WalletStateUtils.calculateEventHash(container.events[1]);


		container = await WalletStateOperations.foldOldEventsIntoBaseState(container, -1);
		assert(container.lastEventHash === e2Hash);


	});

})
