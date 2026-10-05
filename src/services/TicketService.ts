import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    EmbedBuilder,
    Guild,
    GuildMember,
    PermissionFlagsBits,
    TextChannel,
} from "discord.js";

import type {
    GuildConfig,
} from "../database/DatabaseService";

import { EmbedFactory } from "../utils/EmbedFactory";
import { EmbedFactory } from "../utils/EmbedFactory";

import { DatabaseService } from "../database/DatabaseService";

export class TicketService {
    constructor(
        private readonly client: Client,
        private readonly database: DatabaseService
    ) {}

    async createTicket(
        guild: Guild,
        member: GuildMember,
        guildConfig: GuildConfig
    ): Promise<TextChannel> {
        const existingTicket =
            this.database.getOpenTicketByOwner(
                guild.id,
                member.id
            );

        if (existingTicket) {
            const existingChannel =
                guild.channels.cache.get(
                    existingTicket.channelId
                );

            if (existingChannel) {
                throw new Error(
                    `You already have an open ticket: <#${existingTicket.channelId}>`
                );
            }

            // Database had an old ticket whose channel no longer exists.
            this.database.deleteTicket(
                existingTicket.channelId
            );
        }

        const permissionOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [
                    PermissionFlagsBits.ViewChannel,
                ],
            },
            {
                id: member.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                ],
            },
        ];

        permissionOverwrites.push({
            id: guildConfig.staffRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
            ],
        });

        const ticketNumber =
            this.database.getNextTicketNumber(
                guild.id
            );

        const formattedNumber =
            ticketNumber
                .toString()
                .padStart(4, "0");

        const channel = await guild.channels.create({
            name: `ticket-${formattedNumber}`,
            type: ChannelType.GuildText,
            topic: `ticket:${member.id}`,
            parent: guildConfig.ticketCategoryId,
            permissionOverwrites,
        });

        this.database.createTicket(
            channel.id,
            guild.id,
            member.id,
            ticketNumber
        );

        const embed =
            EmbedFactory.info(
                `Support Ticket #${formattedNumber}`,
                [
                    `Welcome ${member}.`,
                    "",
                    "Please describe what you need help with.",
                    "A staff member will respond as soon as possible.",
                ].join("\n")
            )
            .addFields({
                name: "Ticket Owner",
                value: `${member}`,
                inline: true,
            })
            .setFooter({
                text: `Ticket #${formattedNumber}`,
            });

        const buttons =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_claim")
                    .setLabel("Claim")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Secondary)
            );

                await channel.send({
                    content: `${member}`,
                    embeds: [embed],
                    components: [buttons],
                });

                return channel;
            }

    getTicketOwnerId(
        channel: TextChannel
    ): string | null {
        const topic = channel.topic;

        if (!topic?.startsWith("ticket:")) {
            return null;
        }

        return topic.slice("ticket:".length);
    }

    async showCloseConfirmation(
        channel: TextChannel
    ): Promise<void> {
        const row =
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_close_confirm")
                        .setLabel("Confirm Close")
                        .setStyle(ButtonStyle.Danger),

                    new ButtonBuilder()
                        .setCustomId("ticket_close_cancel")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Secondary)
                );

        await channel.send({
            embeds: [
                EmbedFactory.warning(
                    "Close Ticket?",
                    "Are you sure you want to close this ticket?"
                )
            ],
            components: [row],
        });
    }
    
    async reopenTicket(
        channel: TextChannel
    ): Promise<void> {
        const ticket =
            this.database.getTicket(channel.id);

        if (!ticket) {
            throw new Error(
                "This channel is not registered as a ticket."
            );
        }

        if (ticket.status !== "closed") {
            throw new Error(
                "This ticket is already open."
            );
        }

        await channel.permissionOverwrites.edit(
            ticket.ownerId,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            }
        );

        const row =
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_claim")
                        .setLabel("Claim")
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId("ticket_close")
                        .setLabel("Close")
                        .setStyle(ButtonStyle.Secondary)
                );

        await channel.send({
            embeds: [
                EmbedFactory.success(
                    "Ticket Reopened",
                    [
                        `<@${ticket.ownerId}> can send messages again.`,
                        "",
                        "This ticket is available for staff to claim.",
                    ].join("\n")
                )
            ],
            components: [row],
        });

        this.database.reopenTicket(
            channel.id
        );
    }

    async createTranscript(
        channel: TextChannel
    ): Promise<string> {
        const messages = await channel.messages.fetch({
            limit: 100,
        });

        const sorted = [...messages.values()]
            .sort(
                (a, b) =>
                    a.createdTimestamp -
                    b.createdTimestamp
            );

        const lines = sorted.map((message) => {
            const timestamp = new Date(
                message.createdTimestamp
            ).toISOString();

            const content =
                message.content || "[No text content]";

            return `[${timestamp}] ${message.author.tag}: ${content}`;
        });

        return lines.join("\n");
    }

    async sendTicketLog(
        channel: TextChannel,
        transcript: string
    ): Promise<void> {
        const guildConfig =
            this.database.getGuildConfig(
                channel.guild.id
            );

        if (!guildConfig) {
            throw new Error(
                "Ticket system is not configured for this server."
            );
        }

        const logChannel =
            await this.client.channels.fetch(
                guildConfig.ticketLogChannelId
            );

        if (
            !logChannel ||
            !logChannel.isTextBased() ||
            logChannel.isDMBased()
        ) {
            throw new Error(
                "The configured ticket log channel is invalid."
            );
        }

        const ticket =
            this.database.getTicket(
                channel.id
            );

        const transcriptFile =
            new AttachmentBuilder(
                Buffer.from(
                    transcript,
                    "utf8"
                ),
                {
                    name:
                        `ticket-${channel.id}.txt`,
                }
            );

        const embed =
            new EmbedBuilder()
                .setTitle("Ticket Closed")
                .addFields(
                    {
                        name: "Ticket",
                        value: channel.name,
                        inline: true,
                    },
                    {
                        name: "Owner",
                        value:
                            ticket
                                ? `<@${ticket.ownerId}>`
                                : "Unknown",
                        inline: true,
                    },
                    {
                        name: "Claimed By",
                        value:
                            ticket?.claimedBy
                                ? `<@${ticket.claimedBy}>`
                                : "Unclaimed",
                        inline: true,
                    }
                )
                .setTimestamp();

        await logChannel.send({
            embeds: [embed],
            files: [transcriptFile],
        });
    }

    async claimTicket(
        channel: TextChannel,
        member: GuildMember
    ): Promise<void> {
        const ticket =
            this.database.getTicket(channel.id);

        if (!ticket) {
            throw new Error(
                "This channel is not registered as a ticket."
            );
        }

        if (ticket.status !== "open") {
            throw new Error(
                "This ticket is closed."
            );
        }

        if (ticket.claimedBy) {
            if (ticket.claimedBy === member.id) {
                throw new Error(
                    "You already claimed this ticket."
                );
            }

            throw new Error(
                `This ticket is already claimed by <@${ticket.claimedBy}>.`
            );
        }

        const claimed =
            this.database.claimTicket(
                channel.id,
                member.id
            );

        if (!claimed) {
            throw new Error(
                "This ticket has already been claimed."
            );
        }

        await channel.send({
            embeds: [
                EmbedFactory.info(
                    "Ticket Claimed",
                    `This ticket was claimed by ${member}.`
                )
            ],
        });
    }

    async closeTicket(
        channel: TextChannel
    ): Promise<void> {
        const ticket =
            this.database.getTicket(channel.id);

        if (!ticket) {
            throw new Error(
                "This channel is not registered as a ticket."
            );
        }

        if (ticket.status === "closed") {
            throw new Error(
                "This ticket is already closed."
            );
        }

        const transcript =
            await this.createTranscript(channel);

        await this.sendTicketLog(
            channel,
            transcript
        );

        await channel.permissionOverwrites.edit(
            ticket.ownerId,
            {
                SendMessages: false,
            }
        );

        const row =
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_reopen")
                        .setLabel("Reopen")
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId("ticket_delete")
                        .setLabel("Delete")
                        .setStyle(ButtonStyle.Danger)
                );

        await channel.send({
            embeds: [
                EmbedFactory.warning(
                    "Ticket Closed",
                    "This ticket has been closed and its transcript has been saved."
                )
            ],
            components: [row],
        });

        // Save state only after Discord operations succeed.
        this.database.closeTicket(
            channel.id
        );
    }

    async deleteTicket(
        channel: TextChannel
    ): Promise<void> {
        this.database.deleteTicket(
            channel.id
        );

        await channel.delete(
            "Ticket deleted"
        );
    }
}