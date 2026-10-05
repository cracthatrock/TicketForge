import { SlashCommandBuilder } from "discord.js";

import type { Command } from "../../types/Command";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's latency."),

    async execute(interaction) {
        await interaction.reply({
            content: `Pong! ${interaction.client.ws.ping}ms`,
        });
    },
};

export default command;