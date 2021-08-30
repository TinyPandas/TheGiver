import {
	ApplicationCommand,
	ApplicationCommandData,
	ApplicationCommandOptionChoice,
	Collection,
	Guild,
	Role,
	Snowflake,
} from "discord.js";
import configModel from "./configModel";

export async function canReload(guildId: Snowflake): Promise<boolean> {
	const f = configModel
		.findOne({ guildId: String(guildId) })
		.then(document => {
			//compare lastReload to updatedAt
			if (document) {
				const reload = document.get("lastReload") as Date;
				const update = document.get("lastUpdate") as Date;

				console.log(reload);
				console.log(update);

				if (reload < update) {
					console.log("Can update");
					return true;
				}

				return false;
			}

			return false;
		})
		.catch(() => {
			console.error.bind(console);
			return false;
		});

	return f;
}

export function generateRolePayload(categories: ApplicationCommandOptionChoice[]): ApplicationCommandData {
	const rolePayload: ApplicationCommandData = {
		name: "role",
		description: "Modify self-assignable roles.",
		defaultPermission: false,
		options: [
			{
				name: "category",
				description: "The self-assignable category to modify.",
				type: "STRING",
				required: true,
				choices: categories,
			},
		],
	};

	return rolePayload;
}

export function generateRoleModifyPayload(categories: ApplicationCommandOptionChoice[]): ApplicationCommandData {
	const roleModifyPayload: ApplicationCommandData = {
		name: "rolemodify",
		description: "Modifies roles and category bindings.",
		defaultPermission: false,
		options: [
			{
				name: "create",
				description: "Create a new category.",
				type: "SUB_COMMAND",
				options: [
					{
						name: "name",
						description: "The name of the new category.",
						type: "STRING",
						required: true,
					},
				],
			},
			{
				name: "edit",
				description: "Edit a role or category.",
				type: "SUB_COMMAND_GROUP",
				options: [
					{
						name: "role",
						description: "Edit a role binding.",
						type: "SUB_COMMAND",
						options: [
							{
								name: "role",
								description: "The role to update.",
								type: "ROLE",
								required: true,
							},
							{
								name: "category",
								description: "The new category for the role.",
								type: "STRING",
								choices: categories,
							},
							{
								name: "reload-category",
								description: "Use this when creating a new category.",
								type: "STRING",
							},
						],
					},
					{
						name: "category",
						description: "Edit a category.",
						type: "SUB_COMMAND",
						options: [
							{
								name: "category",
								description: "The category to update.",
								type: "STRING",
								required: true,
								choices: categories,
							},
							{
								name: "name",
								description: "The new name for this category.",
								type: "STRING",
								required: true,
							},
						],
					},
				],
			},
			{
				name: "reload",
				description: "Reload the command to display latest changes.",
				type: "SUB_COMMAND",
			},
			{
				name: "remove",
				description: "Remove a role or category.",
				type: "SUB_COMMAND_GROUP",
				options: [
					{
						name: "role",
						description: "Edit a role binding.",
						type: "SUB_COMMAND",
						options: [
							{
								name: "role",
								description: "The role to update.",
								type: "ROLE",
								required: true,
							},
						],
					},
					{
						name: "category",
						description: "Edit a category.",
						type: "SUB_COMMAND",
						options: [
							{
								name: "category",
								description: "The category to update.",
								type: "STRING",
								required: true,
								choices: categories,
							},
						],
					},
				],
			},
		],
	};

	return roleModifyPayload;
}

export function getDefaultPayload(): ApplicationCommandData[] {
	return [
		{
			name: "rolemodify",
			description: "Modifies roles and category bindings.",
			defaultPermission: false,
			options: [
				{
					name: "create",
					description: "Create a new category.",
					type: "SUB_COMMAND",
					options: [
						{
							name: "name",
							description: "The name of the new category.",
							type: "STRING",
							required: true,
						},
					],
				},
				{
					name: "reload",
					description: "Reload the command to display latest changes.",
					type: "SUB_COMMAND",
				},
			],
		},
	];
}

export async function shouldLoadCommands(guild: Guild): Promise<boolean> {
	const cats: ApplicationCommandOptionChoice[] = [];

	await configModel
		.findOne({ guildId: guild.id })
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

	const commands = guild.commands;

	if (commands) {
		const loadedCommands = await commands.fetch();

		if (loadedCommands.find(command => command.name === "role")) return false;
		if (loadedCommands.find(command => command.name === "rolemodify")) return false;

		if (cats.length > 0) return true;

		return true;
	}

	return true;
}

export async function setPermissions(
	guild: Guild,
	slashCommands: Collection<string, ApplicationCommand>
): Promise<void> {
	let memberId = "";
	let roleManagerId = "";

	await configModel
		.findOne({ guildId: String(guild.id) })
		.then(document => {
			if (document) {
				memberId = String(document.get("memberId"));
				roleManagerId = String(document.get("roleManagerId"));
			}
		})
		.catch(console.error.bind(console));

	const roleCommand = slashCommands.find(command => command.name === "role");
	const roleModifyCommand = slashCommands.find(command => command.name === "rolemodify");

	if (roleCommand) {
		guild.commands.permissions
			.set({
				command: roleCommand.id,
				permissions: [
					{
						id: memberId.length > 0 ? memberId : "0",
						type: "ROLE",
						permission: true,
					},
				],
			})
			.catch(console.error.bind(console));
	}

	if (roleModifyCommand) {
		guild.commands.permissions
			.set({
				command: roleModifyCommand.id,
				permissions: [
					{
						id: roleManagerId.length > 0 ? roleManagerId : "0",
						type: "ROLE",
						permission: true,
					},
				],
			})
			.catch(console.error.bind(console));
	}

	return;
}

async function hasDocument(guildId: string): Promise<boolean> {
	const data = await configModel.findOne({ guildId });

	if (data) return Promise.resolve(true);

	return Promise.resolve(false);
}

async function createData(guildId: string): Promise<void> {
	await configModel.create({ guildId }).catch(console.error.bind(console));
}

export async function reloadGuild(guild: Guild, commands?: ApplicationCommandData[]): Promise<void> {
	const hasData = await hasDocument(guild.id);

	if (!hasData) {
		await createData(guild.id);
	}

	guild.commands
		.set(commands ?? getDefaultPayload())
		.then(slashCommands => {
			setPermissions(guild, slashCommands).catch(console.error.bind(console));
		})
		.catch(console.error.bind(console));
}

export async function setGuildRole(guild: Guild, type: string, role: Role | string): Promise<void> {
	const hasData = await hasDocument(guild.id);

	if (!hasData) {
		await createData(guild.id);
	}

	configModel
		.updateOne({ guildId: guild.id }, { [type]: role instanceof Role ? String(role.id) : role })
		.catch(console.error.bind(console));
}

export async function initializeGuild(guild: Guild): Promise<void> {
	await createData(guild.id);

	const roles = await guild.roles.fetch();

	const memberRole = roles.find(
		role => role.name.toLowerCase() === "member" || role.name.toLowerCase() === "members"
	);
	const roleManagerRole = roles.find(role => role.name.toLowerCase() === "rolemanager");

	if (memberRole) {
		await setGuildRole(guild, "memberId", memberRole);
	}

	if (roleManagerRole) {
		await setGuildRole(guild, "roleManagerId", roleManagerRole);
	}

	if (memberRole && roleManagerRole) {
		await reloadGuild(guild);
	}

	return;
}
