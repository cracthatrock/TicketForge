import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command";
import { database } from "../../database";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("ticket-panel")
        .setDescription(
            "Post the ticket creation panel."
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
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

        const guildConfig =
            database.getGuildConfig(
                interaction.guild.id
            );

        if (!guildConfig) {
            await interaction.reply({
                content:
                    "Run `/setup-ticket` before creating a ticket panel.",
                ephemeral: true,
            });

            return;
        }

        const embed =
            new EmbedBuilder()
                .setTitle(
                    guildConfig.panelTitle
                )
                .setDescription(
                    guildConfig.panelDescription
                )
                .setFooter({
                    text:
                        `${interaction.guild.name} • Support System`,
                })
                .setTimestamp();

        const row =
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_create"
                        )
                        .setLabel(
                            "Open Ticket"
                        )
                        .setEmoji("🎫")
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        await interaction.channel?.send({
            embeds: [embed],
            components: [row],
        });

        await interaction.reply({
            content:
                "Ticket panel created.",
            ephemeral: true,
        });
    },
};

export default command;