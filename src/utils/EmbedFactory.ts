import {
    EmbedBuilder,
} from "discord.js";

export class EmbedFactory {
    static success(
        title: string,
        description: string
    ): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static info(
        title: string,
        description: string
    ): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static warning(
        title: string,
        description: string
    ): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static error(
        title: string,
        description: string
    ): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }
}