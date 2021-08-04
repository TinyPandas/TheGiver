import { MessageActionRow, MessageSelectMenu } from "discord.js";
import type { Command } from "./command";
import configModel from "./configModel";

const command: Command = {
	handler: (interaction, args) => {
		const guild = interaction.guild;

		if (guild) {
			const options = new Map<string, string | number | boolean | undefined>();
			args["_hoistedOptions"].forEach(option => options.set(option.name, option.value));

			const categoryName = options.get("category") as string;

			configModel
				.findOne({ guildId: String(guild.id) })
				.then(async document => {
					if (document) {
						const categories = document.get("categories") as string[][];

						let list: string[] = [];

						categories.forEach(category => {
							if (String(category[0]).toLowerCase() === categoryName) {
								list = category.splice(1);
							}
						});

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
								content: `Category: ${categoryName}\n${roles
									.map(role => `<@&${role.id}>`)
									.join("\n")}\n`,
								components: [row],
								ephemeral: true,
							})
							.catch(console.error.bind(console));
					}
				})
				.catch(console.error.bind(console));
		}
	},
};

export default command;
