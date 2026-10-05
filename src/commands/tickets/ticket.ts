import {
    GuildMember,
    SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../../types/Command";
import type {
    GuildConfig,
} from "../../database/DatabaseService";

import { TicketService } from "../../services/TicketService";

import { config } from "../../config";
import { database } from "../../database";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription(
            "Create a support ticket."
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
                    "The ticket system has not been configured yet. An administrator must run `/setup-ticket` first.",
                ephemeral: true,
            });

            return;
        }

        const member =
            interaction.member as GuildMember;

        const ticketService =
            new TicketService(
                interaction.client,
                database
            );

        try {
            const channel =
                await ticketService.createTicket(
                    interaction.guild,
                    member,
                    guildConfig
                );

            await interaction.reply({
                content:
                    `Ticket created: ${channel}`,
                ephemeral: true,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to create ticket.";

            await interaction.reply({
                content: message,
                ephemeral: true,
            });
        }
    },
};

export default command;