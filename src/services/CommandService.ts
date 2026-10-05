import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { Client } from "discord.js";

import type { Command } from "../types/Command";

export class CommandService {
    private readonly commands = new Map<string, Command>();

    async loadCommands(): Promise<void> {
        const commandsPath = path.join(
            process.cwd(),
            "src",
            "commands"
        );

        await this.loadDirectory(commandsPath);
    }

    private async loadDirectory(
        directory: string
    ): Promise<void> {
        const entries = fs.readdirSync(directory, {
            withFileTypes: true,
        });

        for (const entry of entries) {
            const fullPath = path.join(
                directory,
                entry.name
            );

            if (entry.isDirectory()) {
                await this.loadDirectory(fullPath);
                continue;
            }

            if (!entry.name.endsWith(".ts")) {
                continue;
            }

            const moduleUrl =
                pathToFileURL(fullPath).href;

            const module =
                await import(moduleUrl);

            const command =
                module.default as
                    | Command
                    | undefined;

            if (!command) {
                console.warn(
                    `Skipped ${fullPath}: no default export`
                );

                continue;
            }

            if (!command.data) {
                console.warn(
                    `Skipped ${fullPath}: command has no "data" property`
                );

                continue;
            }

            if (!command.data.name) {
                console.warn(
                    `Skipped ${fullPath}: command.data has no name`
                );

                continue;
            }

            if (
                typeof command.execute !==
                "function"
            ) {
                console.warn(
                    `Skipped ${fullPath}: command has no execute function`
                );

                continue;
            }

            const name =
                command.data.name;

            this.commands.set(
                name,
                command
            );

            console.log(
                `Loaded command: /${name}`
            );
        }
    }

    registerInteractionHandler(client: Client): void {
        client.on("interactionCreate", async (interaction) => {
            if (!interaction.isChatInputCommand()) {
                return;
            }

            const command = this.commands.get(
                interaction.commandName
            );

            if (!command) {
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(
                    `Command /${interaction.commandName} failed:`,
                    error
                );

                const message = {
                    content:
                        "Something went wrong while running that command.",
                    ephemeral: true,
                };

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {
                    await interaction.followUp(message);
                } else {
                    await interaction.reply(message);
                }
            }
        });
    }

    getCommands(): Command[] {
        return [...this.commands.values()];
    }
}