/**
 * configModel
				.create({
					guildId: guild.id,
					categories: [
						["colors", "-1", "-2"],
						["extras", "-3", "-4"],
					],
				})
				.catch(console.error.bind(console));
 */

/**
/modifyrole
 - create [subcommand]
   + categoryName [required arg | String]
 - remove [subcommand_group]
   + role [required arg | Role]
   + category [required arg | String]
 - edit [subcommand]
   + role [required arg | Role]
   + category [required arg | String]
 - reload [subcommand]
 */
import type { ApplicationCommandOptionChoice } from "discord.js";
import type { Command } from "./command";
import configModel from "./configModel";
import { canReload, generateRoleModifyPayload, generateRolePayload, getDefaultPayload, reloadGuild } from "./util";

const command: Command = {
	handler: async (interaction, args) => {
		const guild = interaction.guild;

		if (guild) {
			const guildQuery = { guildId: String(guild.id) };

			const group = args["_group"];
			const subcommand = args["_subcommand"];
			const options = new Map<string, string | number | boolean | undefined>();
			args["_hoistedOptions"].forEach(option => options.set(option.name, option.value));

			console.log(subcommand);
			console.log(options);

			// Remove in favor of: If category does not exist on edit, create it
			if (subcommand === "create") {
				console.log(options);
				const newCategory = String(options.get("name"));

				configModel
					.findOne(guildQuery)
					.then(document => {
						if (document) {
							const cats = document.get("categories") as string[][];

							cats.push([newCategory]);

							configModel
								.updateOne(guildQuery, {
									categories: cats,
								})
								.catch(console.error.bind(console));
						}
					})
					.catch(console.error.bind(console));

				configModel
					.updateOne(guildQuery, { lastUpdate: new Date(Date.now()) })
					.catch(console.error.bind(console));

				return interaction.reply("Category created successfully.").catch(console.error.bind(console));
			} else if (group === "edit" && subcommand === "role") {
				console.log(options);
				const roleId = String(options.get("role"));
				const categoryName = String(options.get("category"));

				await configModel
					.findOne(guildQuery)
					.then(document => {
						if (document) {
							const categories = document.get("categories") as string[][];

							categories.forEach(category => {
								if (String(category[0]).toLowerCase() !== categoryName) {
									if (category.includes(roleId)) {
										category.splice(category.indexOf(roleId), 1);
									}
								} else {
									category.push(roleId);
								}
							});

							configModel
								.updateOne(guildQuery, { categories: categories })
								.catch(console.error.bind(console));
						}
					})
					.catch(console.error.bind(console));

				configModel
					.updateOne(guildQuery, { lastUpdate: new Date(Date.now()) })
					.catch(console.error.bind(console));

				return interaction.reply("Role edited successfully.").catch(console.error.bind(console));
			} else if (group === "edit" && subcommand === "category") {
				console.log(options);
				const categoryName = String(options.get("category"));
				const newName = String(options.get("name"));

				await configModel
					.findOne(guildQuery)
					.then(document => {
						if (document) {
							const categories = document.get("categories") as string[][];

							categories.forEach(category => {
								if (String(category[0]).toLowerCase() === categoryName) {
									category[0] = newName;
								}
							});

							configModel
								.updateOne(guildQuery, { categories: categories })
								.catch(console.error.bind(console));
						}
					})
					.catch(console.error.bind(console));

				configModel
					.updateOne(guildQuery, { lastUpdate: new Date(Date.now()) })
					.catch(console.error.bind(console));

				return interaction.reply("Category name changed successfully.").catch(console.error.bind(console));
			} else if (group === "remove" && subcommand === "role") {
				console.log(options);
				const roleId = String(options.get("role"));

				await configModel
					.findOne(guildQuery)
					.then(document => {
						if (document) {
							const categories = document.get("categories") as string[][];

							categories.forEach(category => {
								if (category.includes(roleId)) {
									category.splice(category.indexOf(roleId), 1);
								}
							});

							configModel
								.updateOne(guildQuery, { categories: categories })
								.catch(console.error.bind(console));
						}
					})
					.catch(console.error.bind(console));

				configModel
					.updateOne(guildQuery, { lastUpdate: new Date(Date.now()) })
					.catch(console.error.bind(console));

				return interaction.reply("Role removed successfully.").catch(console.error.bind(console));
			} else if (group === "remove" && subcommand === "category") {
				console.log(options);
				const categoryName = String(options.get("category"));

				await configModel
					.findOne(guildQuery)
					.then(document => {
						if (document) {
							const categories = document.get("categories") as string[][];

							categories.forEach(category => {
								if (String(category[0]).toLowerCase() === categoryName) {
									categories.splice(categories.indexOf(category), 1);
								}
							});

							configModel
								.updateOne(guildQuery, { categories: categories })
								.catch(console.error.bind(console));
						}
					})
					.catch(console.error.bind(console));

				configModel
					.updateOne(guildQuery, { lastUpdate: new Date(Date.now()) })
					.catch(console.error.bind(console));

				return interaction.reply("Category removed successfully.").catch(console.error.bind(console));
			} else if (subcommand === "reload") {
				//~~check if reload is needed. (guild only gets 100 command assigns / day)~~
				//reload check: Fetch `lastReload` and `lastModify` from config
				const reloadAvailable = await canReload(guild.id);

				if (!reloadAvailable) {
					return interaction.reply(
						"There have been no logged changes to the db at this time. No reload needed."
					);
				}

				//handle reloading of command.
				// generate list of categories
				const cats: ApplicationCommandOptionChoice[] = [];

				await configModel
					.findOne(guildQuery)
					.then(document => {
						if (document) {
							(document.get("categories") as string[][]).forEach(category => {
								cats.push({
									name: category[0],
									value: category[0].toLowerCase(),
								});
							});
						}
					})
					.catch(console.error.bind(console));

				console.log(cats);

				if (cats.length === 0) {
					const defaultPayload = getDefaultPayload();
					guild.commands.set(defaultPayload).catch(console.error.bind(console));
					return interaction.reply("Category size is 0. Resetting to original command payload.");
				}

				//push full payload
				const rolePayload = generateRolePayload(cats);
				const roleModifyPayload = generateRoleModifyPayload(cats);

				reloadGuild(guild, [rolePayload, roleModifyPayload]);

				configModel
					.updateOne(guildQuery, { lastReload: new Date(Date.now()) })
					.catch(console.error.bind(console));

				return interaction.reply("Reloaded.").catch(console.error.bind(console));
			}

			return interaction.reply("F").catch(console.error.bind(console));
		} else {
			return interaction.reply("Failed to fetch guild data.");
		}
	},
};

export default command;
