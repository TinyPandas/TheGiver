import { MessageActionRow, MessageSelectMenu } from "discord.js";
import colors from "../colors.json";
import extras from "../extras.json";
import type { Command } from "./command";

const command: Command = {
	name: "role",
	description: "Add roles from a list.",
	options: [],
	handler: async (interaction, args) => {
		const options = new Map<string, string | number | boolean | undefined>();
		args["_hoistedOptions"].forEach(option => options.set(option.name, option.value));

		const category = options.get("category") as string;
		const list: string[] = category === "colors" ? colors : extras;

		const roles = (await interaction.guild?.roles.fetch())?.filter(role => list.includes(role.id));

		if (!roles) {
			interaction
				.reply("Unable to fetch roles at this time. Please try again later.")
				.catch(console.error.bind(console));
			return;
		}

		const listRoles = roles.map(role => {
			return {
				label: role.name.substr(0, 24),
				value: role.id,
			};
		});

		if (!roles) {
			interaction
				.reply("Unable to fetch roles at this time. Please try again later.")
				.catch(console.error.bind(console));
			return;
		}

		const row = new MessageActionRow().addComponents(
			new MessageSelectMenu()
				.setCustomId("select")
				.setPlaceholder("Nothing selected")
				.setMinValues(1)
				.setMaxValues(listRoles.length)
				.addOptions(listRoles)
		);

		interaction
			.reply({
				content: `Category: ${category}\n${roles.map(role => `<@&${role.id}>`).join("\n")}\n`,
				components: [row],
				ephemeral: true,
			})
			.catch(console.error.bind(console));
	},
};

export default command;
