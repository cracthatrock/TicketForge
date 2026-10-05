import { REST, Routes } from "discord.js";

import type { Command } from "../types/Command";

export class CommandRegistrationService {
    private readonly rest: REST;

    constructor(
        token: string,
        private readonly clientId: string,
        private readonly guildId: string
    ) {
        this.rest = new REST({
            version: "10",
        }).setToken(token);
    }

    async register(commands: Command[]): Promise<void> {
        const commandData = commands.map((command) =>
            command.data.toJSON()
        );

        console.log(
            `Registering ${commandData.length} slash commands...`
        );

        await this.rest.put(
            Routes.applicationGuildCommands(
                this.clientId,
                this.guildId
            ),
            {
                body: commandData,
            }
        );

        console.log("Slash commands registered.");
    }
}