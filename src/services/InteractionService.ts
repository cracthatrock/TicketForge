import {
    ChannelType,
    Client,
    GuildMember,
    MessageFlags,
    TextChannel,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

import { TicketService } from "./TicketService";

import { DatabaseService } from "../database/DatabaseService";

export class InteractionService {
    constructor(
        private readonly client: Client,
        private readonly database: DatabaseService
    ) {}

    register(): void {
        const ticketService =
            new TicketService(
                this.client,
                this.database
            );

        this.client.on("interactionCreate", async (interaction) => {
            if (!interaction.isButton()) {
                return;
            }

            console.log(
                `Button clicked: ${interaction.customId}`
            );

            if (!interaction.guild) {
                return;
            }

            if (!interaction.channel) {
                return;
            }

            if (
                interaction.channel.type !==
                ChannelType.GuildText
            ) {
                return;
            }

            const channel =
                interaction.channel as TextChannel;

            const member =
                interaction.member as GuildMember;

            const guildConfig =
                this.database.getGuildConfig(
                    interaction.guild.id
                );

            if (!guildConfig) {
                await interaction.reply({
                    content:
                        "The ticket system has not been configured.",
                    flags: MessageFlags.Ephemeral,
                });

                return;
            }
            
            const isStaff =
                member.roles.cache.has(
                    guildConfig.staffRoleId
                );

            if (
                interaction.customId ===
                "ticket_create"
            ) {
                await interaction.deferReply({
                    flags: MessageFlags.Ephemeral,
                });

                const ticketService =
                    new TicketService(
                        this.client,
                        this.database
                    );

                try {
                    const ticketChannel =
                        await ticketService.createTicket(
                            interaction.guild,
                            member,
                            guildConfig
                        );

                    await interaction.editReply({
                        content:
                            `Your ticket has been created: ${ticketChannel}`,
                    });
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unable to create ticket.";

                    await interaction.editReply({
                        content: message,
                    });
                }

                return;
            }

            if (
                interaction.customId === "ticket_claim" ||
                interaction.customId === "ticket_close" ||
                interaction.customId === "ticket_close_confirm" ||
                interaction.customId === "ticket_close_cancel" ||
                interaction.customId === "ticket_reopen" ||
                interaction.customId === "ticket_delete"
            ) {
                if (!isStaff) {
                    await interaction.reply({
                        content:
                            "Only staff members can use this button.",
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }
            }
            
            try {
                switch (interaction.customId) {
                    case "ticket_claim": {
                        await interaction.deferUpdate();

                        await ticketService.claimTicket(
                            channel,
                            member
                        );

                        const row =
                            new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("ticket_claimed")
                                        .setLabel(
                                            `Claimed by ${member.user.username}`
                                        )
                                        .setStyle(ButtonStyle.Success)
                                        .setDisabled(true),

                                    new ButtonBuilder()
                                        .setCustomId("ticket_close")
                                        .setLabel("Close")
                                        .setStyle(ButtonStyle.Secondary)
                                );

                        await interaction.editReply({
                            components: [row],
                        });

                        break;
                    }

                    case "ticket_close": {
                        await interaction.deferReply({
                            flags: MessageFlags.Ephemeral,
                        });

                        await ticketService.showCloseConfirmation(
                            channel
                        );

                        await interaction.editReply({
                            content:
                                "Close confirmation posted.",
                        });

                        break;
                    }

                    case "ticket_delete": {
                        await interaction.reply({
                            content: "Deleting ticket...",
                            flags: MessageFlags.Ephemeral,
                        });

                        setTimeout(() => {
                            void ticketService.deleteTicket(
                                channel
                            );
                        }, 1500);

                        break;
                    }

                    case "ticket_close_confirm": {
                        await interaction.deferUpdate();

                        await ticketService.closeTicket(
                            channel
                        );

                        // Remove Confirm Close / Cancel
                        await interaction.editReply({
                            components: [],
                        });

                        break;
                    }

                    case "ticket_close_cancel": {
                        await interaction.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("Close Cancelled")
                                    .setDescription(
                                        "The ticket will remain open."
                                    ),
                            ],
                            components: [],
                        });

                        break;
                    }

                    case "ticket_reopen": {
                        await interaction.deferUpdate();

                        await ticketService.reopenTicket(
                            channel
                        );

                        // Remove Reopen/Delete from the closed-ticket message.
                        await interaction.editReply({
                            components: [],
                        });

                        break;
                    }
                }
            } catch (error) {
                console.error(
                    `Button ${interaction.customId} failed:`,
                    error
                );

                try {
                    if (
                        interaction.replied ||
                        interaction.deferred
                    ) {
                        await interaction.editReply({
                            content:
                                "Something went wrong while processing this action.",
                        });
                    } else {
                        await interaction.reply({
                            content:
                                "Something went wrong while processing this action.",
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                } catch (replyError) {
                    console.error(
                        "Failed to send error response:",
                        replyError
                    );
                }
            }
        });
    }
}