import {
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command";
import { database } from "../../database";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("ticket-panel-config")
        .setDescription(
            "Customize the ticket panel."
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addStringOption((option) =>
            option
                .setName("title")
                .setDescription(
                    "Title shown on the ticket panel."
                )
                .setMaxLength(100)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("description")
                .setDescription(
                    "Description shown on the ticket panel."
                )
                .setMaxLength(1000)
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply({
                content:
                    "This command can only be used in a server.",
                ephemeral: true,
            });

            return;
        }

        const config =
            database.getGuildConfig(
                interaction.guild.id
            );

        if (!config) {
            await interaction.reply({
                content:
                    "Run `/setup-ticket` first.",
                ephemeral: true,
            });

            return;
        }

        const title =
            interaction.options.getString(
                "title",
                true
            );

        const description =
            interaction.options.getString(
                "description",
                true
            );

        database.setTicketPanel(
            interaction.guild.id,
            title,
            description
        );

        await interaction.reply({
            content:
                "Ticket panel customization saved.",
            ephemeral: true,
        });
    },
};

export default command;