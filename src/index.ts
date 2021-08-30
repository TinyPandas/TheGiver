import { Client, Intents } from "discord.js";
import { readFileSync } from "fs";
import { connect, connection } from "mongoose";
import configModel from "./configModel";
import role from "./roleCommand";
import { handleRoleSelector } from "./roleMenu";
import modify from "./roleModifyCommand";
import { initializeGuild, reloadGuild, setGuildRole, shouldLoadCommands } from "./util";

try {
	const secrets = JSON.parse(readFileSync("token.json", "utf-8")) as { token: string; dburi: string };
	const token = secrets.token;
	const dburi = secrets.dburi;

	if (token.length === 0) {
		throw new Error("Invalid token provided. Please be sure that `auth.json` contains your bot token.");
	}

	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
	});

	client.on("ready", () => {
		console.log("Client logged in.");

		client.guilds
			.fetch()
			.then(guilds => {
				guilds.forEach(oauthGuild => {
					oauthGuild
						.fetch()
						.then(async guild => {
							const shouldLoad = await shouldLoadCommands(guild);

							if (shouldLoad) {
								await reloadGuild(guild);
							}
						})
						.catch(console.error.bind(console));
				});
			})
			.catch(console.error.bind(console));
	});

	client.on("guildCreate", initializeGuild);

	client.on("messageCreate", async message => {
		const guild = message.guild;
		const author = message.member;

		if (guild) {
			if (author) {
				const canAdjustRoles = author.permissions.has("MANAGE_ROLES") && author.permissions.has("MANAGE_GUILD");

				const content = message.content.toLowerCase();

				if (content.startsWith("!setroles") && canAdjustRoles) {
					const args = content.substr("!setroles ".length).split(" ");

					console.log(args);
					if (args.length >= 2) {
						const memberId = args[0].replace("<@&", "").replace(">", "");
						const roleManagerId = args[1].replace("<@&", "").replace(">", "");

						console.log(memberId);
						console.log(roleManagerId);

						await setGuildRole(guild, "memberId", memberId);
						await setGuildRole(guild, "roleManagerId", roleManagerId);

						await reloadGuild(guild);

						configModel
							.updateOne({ guildId: guild.id }, { lastUpdate: new Date(Date.now()) })
							.catch(console.error.bind(console));
					} else if (args.length === 1) {
						const unknownId = args[0].substr(3).replace("<@&", "").replace(">", "");
						const classifier = args[0].substr(1, 1);

						await setGuildRole(guild, classifier === "m" ? "memberId" : "roleManagerId", unknownId);
						await reloadGuild(guild);

						configModel
							.updateOne({ guildId: guild.id }, { lastUpdate: new Date(Date.now()) })
							.catch(console.error.bind(console));
					}
				}
			}
		}
	});

	client.on("interactionCreate", interaction => {
		if (interaction.isSelectMenu() && interaction.customId === "select") {
			handleRoleSelector(interaction);
		} else if (interaction.isCommand()) {
			const commandName = interaction.commandName;

			if (commandName === "role") {
				role.handler(interaction, interaction.options);
			} else if (commandName === "rolemodify") {
				modify.handler(interaction, interaction.options);
			}
		}
	});

	client.login(token).catch(console.error.bind(console));

	connect(dburi, {
		ssl: true,
		useCreateIndex: true,
		useFindAndModify: false,
		useNewUrlParser: true,
		useUnifiedTopology: true,
	}).catch(console.error.bind(console));

	connection.on("error", console.error.bind(console));
} catch (e) {
	console.error(e);
}
