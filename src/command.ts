import type { CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

export interface Command {
	readonly handler: (interaction: CommandInteraction, args: CommandInteractionOptionResolver) => void;
}
