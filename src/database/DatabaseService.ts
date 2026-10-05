import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type TicketRecord = {
    channelId: string;
    guildId: string;
    ownerId: string;
    ticketNumber: number;
    claimedBy: string | null;
    status: "open" | "closed";
    createdAt: number;
};

export type GuildConfig = {
    guildId: string;
    staffRoleId: string;
    ticketCategoryId: string;
    ticketLogChannelId: string;

    panelTitle: string;
    panelDescription: string;
};

export class DatabaseService {
    private readonly db: Database.Database;

    constructor() {
        const dataDirectory = path.join(
            process.cwd(),
            "data"
        );

        fs.mkdirSync(dataDirectory, {
            recursive: true,
        });

        const databasePath = path.join(
            dataDirectory,
            "bot.db"
        );

        this.db = new Database(databasePath);

        this.initialize();
    }

    private initialize(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tickets (
                channel_id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                ticket_number INTEGER NOT NULL,
                claimed_by TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                created_at INTEGER NOT NULL
            );
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id TEXT PRIMARY KEY,
                staff_role_id TEXT NOT NULL,
                ticket_category_id TEXT NOT NULL,
                ticket_log_channel_id TEXT NOT NULL
            );
        `);

        const guildConfigColumns =
            this.db.prepare(`
                PRAGMA table_info(guild_config)
            `).all() as Array<{
                name: string;
            }>;

        const columnNames =
            new Set(
                guildConfigColumns.map(
                    (column) => column.name
                )
            );

        if (!columnNames.has("panel_title")) {
            this.db.exec(`
                ALTER TABLE guild_config
                ADD COLUMN panel_title TEXT
                NOT NULL DEFAULT 'Support';
            `);
        }

        if (!columnNames.has("panel_description")) {
            this.db.exec(`
                ALTER TABLE guild_config
                ADD COLUMN panel_description TEXT
                NOT NULL DEFAULT 'Need help from our staff? Click the button below to create a private support ticket.';
            `);
        }

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_tickets_owner
            ON tickets(guild_id, owner_id);
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ticket_counters (
                guild_id TEXT PRIMARY KEY,
                next_number INTEGER NOT NULL
            );
        `);
    }

    setGuildConfig(
        guildId: string,
        staffRoleId: string,
        ticketCategoryId: string,
        ticketLogChannelId: string
    ): void {
        this.db.prepare(`
            INSERT INTO guild_config (
                guild_id,
                staff_role_id,
                ticket_category_id,
                ticket_log_channel_id
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(guild_id)
            DO UPDATE SET
                staff_role_id = excluded.staff_role_id,
                ticket_category_id = excluded.ticket_category_id,
                ticket_log_channel_id = excluded.ticket_log_channel_id
        `).run(
            guildId,
            staffRoleId,
            ticketCategoryId,
            ticketLogChannelId
        );
    }

    getGuildConfig(
        guildId: string
    ): GuildConfig | null {
        const row = this.db.prepare(`
            SELECT
                guild_id AS guildId,
                staff_role_id AS staffRoleId,
                ticket_category_id AS ticketCategoryId,
                ticket_log_channel_id AS ticketLogChannelId,
                panel_title AS panelTitle,
                panel_description AS panelDescription
            FROM guild_config
            WHERE guild_id = ?
        `).get(guildId) as GuildConfig | undefined;

        return row ?? null;
    }

    setTicketPanel(
        guildId: string,
        title: string,
        description: string
    ): void {
        this.db.prepare(`
            UPDATE guild_config
            SET
                panel_title = ?,
                panel_description = ?
            WHERE guild_id = ?
        `).run(
            title,
            description,
            guildId
        );
    }

    getNextTicketNumber(
        guildId: string
    ): number {
        const transaction =
            this.db.transaction(() => {
                const row = this.db.prepare(`
                    SELECT next_number AS nextNumber
                    FROM ticket_counters
                    WHERE guild_id = ?
                `).get(guildId) as
                    | { nextNumber: number }
                    | undefined;

                if (!row) {
                    this.db.prepare(`
                        INSERT INTO ticket_counters (
                            guild_id,
                            next_number
                        )
                        VALUES (?, ?)
                    `).run(
                        guildId,
                        2
                    );

                    return 1;
                }

                const current =
                    row.nextNumber;

                this.db.prepare(`
                    UPDATE ticket_counters
                    SET next_number = ?
                    WHERE guild_id = ?
                `).run(
                    current + 1,
                    guildId
                );

                return current;
            });

        return transaction();
    }

    createTicket(
        channelId: string,
        guildId: string,
        ownerId: string,
        ticketNumber: number
    ): void {
        const statement = this.db.prepare(`
            INSERT INTO tickets (
                channel_id,
                guild_id,
                owner_id,
                ticket_number,
                claimed_by,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, NULL, 'open', ?)
        `);

        statement.run(
            channelId,
            guildId,
            ownerId,
            ticketNumber,
            Date.now()
        );
    }

    reopenTicket(
        channelId: string
    ): void {
        this.db.prepare(`
            UPDATE tickets
            SET
                status = 'open',
                claimed_by = NULL
            WHERE channel_id = ?
        `).run(channelId);
    }


    getTicket(
        channelId: string
    ): TicketRecord | null {
        const row = this.db.prepare(`
            SELECT
                channel_id AS channelId,
                guild_id AS guildId,
                owner_id AS ownerId,
                ticket_number AS ticketNumber,
                claimed_by AS claimedBy,
                status,
                created_at AS createdAt
            FROM tickets
            WHERE channel_id = ?
        `).get(channelId) as TicketRecord | undefined;

        return row ?? null;
    }

    getOpenTicketByOwner(
        guildId: string,
        ownerId: string
    ): TicketRecord | null {
        const row = this.db.prepare(`
            SELECT
                channel_id AS channelId,
                guild_id AS guildId,
                owner_id AS ownerId,
                ticket_number AS ticketNumber,
                claimed_by AS claimedBy,
                status,
                created_at AS createdAt
            FROM tickets
            WHERE guild_id = ?
            AND owner_id = ?
            AND status = 'open'
            LIMIT 1
        `).get(
            guildId,
            ownerId
        ) as TicketRecord | undefined;

        return row ?? null;
    }

    claimTicket(
        channelId: string,
        staffId: string
    ): boolean {
        const result = this.db.prepare(`
            UPDATE tickets
            SET claimed_by = ?
            WHERE channel_id = ?
              AND claimed_by IS NULL
              AND status = 'open'
        `).run(
            staffId,
            channelId
        );

        return result.changes > 0;
    }

    closeTicket(
        channelId: string
    ): void {
        this.db.prepare(`
            UPDATE tickets
            SET status = 'closed'
            WHERE channel_id = ?
        `).run(channelId);
    }

    deleteTicket(
        channelId: string
    ): void {
        this.db.prepare(`
            DELETE FROM tickets
            WHERE channel_id = ?
        `).run(channelId);
    }
}