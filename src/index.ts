import { Client, Intents } from "discord.js";
import { readFileSync } from "fs";
import role from "./roleCommand";
import { handleRoleSelector } from "./roleMenu";

try {
	const token = (JSON.parse(readFileSync("token.json", "utf-8")) as { token: string }).token;

	if (token.length === 0) {
		throw new Error("Invalid token provided. Please be sure that `auth.json` contains your bot token.");
	}

	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
	});

	client.on("ready", async () => {
		console.log("Client logged in.");

		const guild = client.guilds.cache.first();
		if (guild) {
			const commands = guild.commands;

			if (!commands) {
				console.error("Failed to generate commands.");
				process.exit(0);
			}

			let memberRole = guild.roles.cache.find(role => role.name === "Members");

			if (!memberRole) {
				console.warn("Failed to bind member role. Attempting to fetch from gateway.");

				const roles = await guild.roles.fetch();

				roles.forEach(role => {
					if (role.name === "Members") {
						memberRole = role;
						console.log("Successfully bound member role.");
					}
				});

				if (!memberRole) {
					console.error("Failed to fetch member role from gateway.");
					process.exit(0);
				}
			} else {
				console.log("Successfully bound member role.");
			}

			commands
				.set([
					{
						name: "role",
						description: "Modify self-assignable roles.",
						defaultPermission: false,
						options: [
							{
								name: "category",
								description: "The self-assignable category to modify.",
								type: "STRING",
								required: true,
								choices: [
									{
										name: "Color",
										value: "colors",
									},
									{
										name: "Extras",
										value: "extras",
									},
								],
							},
						],
					},
				])
				.then(slashCommands => {
					console.log("Setting permissions for slash-command.");
					if (!memberRole) {
						console.error("Somehow got this far with an error. [Failed to bind member role]");
						process.exit(0);
					}
					commands.permissions
						.set({
							command: slashCommands.first()?.id ?? "0",
							permissions: [
								{
									id: memberRole.id,
									type: "ROLE",
									permission: true,
								},
							],
						})
						.catch(console.error.bind(console));
				})
				.catch(console.error.bind(console));
		}
	});

	client.on("interactionCreate", interaction => {
		if (interaction.isSelectMenu() && interaction.customId === "select") {
			handleRoleSelector(interaction);
		} else if (interaction.isCommand() && interaction.commandName === "role") {
			role.handler(interaction, interaction.options);
		}
	});

	client.login(token).catch(console.error.bind(console));
} catch (e) {
	console.error(e);
}
