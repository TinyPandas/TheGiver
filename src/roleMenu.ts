import type { SelectMenuInteraction } from "discord.js";

export function handleRoleSelector(interaction: SelectMenuInteraction): void {
	const choices = interaction.values;
	const member = interaction.guild?.members.cache.get(interaction.user.id);

	if (!member) {
		interaction
			.update({ content: "Failed to retrieve member data.", components: [] })
			.catch(console.error.bind(console));
		return;
	}

	let added = 0;
	let removed = 0;

	choices?.forEach(choice => {
		if (member.roles.cache.has(choice)) {
			removed++;
			member.roles.remove(choice).catch(console.error.bind(console));
		} else {
			added++;
			member.roles.add(choice).catch(console.error.bind(console));
		}
	});

	const result = `Roles were updated!${added > 0 ? ` Added: ${added}` : ""}${added > 0 && removed > 0 ? " | " : ""}${
		removed > 0 ? ` Removed: ${removed}` : ""
	}`;

	interaction.update({ content: result, components: [] }).catch(console.error.bind(console));
}
