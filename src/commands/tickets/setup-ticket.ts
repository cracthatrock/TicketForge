import {
    ChannelType,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command";
import { database } from "../../database";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("setup-ticket")
        .setDescription(
            "Configure the ticket system for this server."
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addRoleOption((option) =>
            option
                .setName("staff-role")
                .setDescription(
                    "The role allowed to manage tickets."
                )
                .setRequired(true)
        )

        .addChannelOption((option) =>
            option
                .setName("ticket-category")
                .setDescription(
                    "The category where tickets will be created."
                )
                .addChannelTypes(
                    ChannelType.GuildCategory
                )
                .setRequired(true)
        )

        .addChannelOption((option) =>
            option
                .setName("log-channel")
                .setDescription(
                    "The channel where ticket logs and transcripts are sent."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply({
                content:
                    "This command can only be used inside a server.",
                ephemeral: true,
            });

            return;
        }

        const staffRole =
            interaction.options.getRole(
                "staff-role",
                true
            );

        const ticketCategory =
            interaction.options.getChannel(
                "ticket-category",
                true
            );

        const logChannel =
            interaction.options.getChannel(
                "log-channel",
                true
            );

        database.setGuildConfig(
            interaction.guild.id,
            staffRole.id,
            ticketCategory.id,
            logChannel.id
        );

        await interaction.reply({
            content: [
                "Ticket system configured.",
                "",
                `Staff Role: ${staffRole}`,
                `Ticket Category: ${ticketCategory}`,
                `Log Channel: ${logChannel}`,
            ].join("\n"),
            ephemeral: true,
        });
    },
};

export default command;