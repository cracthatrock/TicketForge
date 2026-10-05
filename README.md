# TicketForge

A configurable Discord support bot built with TypeScript, discord.js, and SQLite.

TicketForge is designed for server owners who want a clean ticket system with staff controls, transcripts, persistent configuration, and an easy setup process.

## Features

- Ticket creation panel
- Private support channels
- Persistent ticket numbering
- Staff claim system
- Close confirmation
- Reopen tickets
- Delete tickets
- Ticket transcripts
- Ticket logging
- Per-server configuration
- Custom ticket panel title and description
- SQLite persistence
- Slash commands
- Configurable staff role
- Configurable ticket category
- Configurable log channel

## Commands

### `/setup-ticket`

Configures the ticket system for the current server.

Required options:

- Staff role
- Ticket category
- Ticket log channel

### `/ticket-panel-config`

Customizes the ticket panel.

Options:

- Title
- Description

### `/ticket-panel`

Posts the ticket panel in the current channel.

### `/ticket`

Creates a ticket directly without using the panel.

### `/ping`

Checks whether the bot is online and shows its latency.

## Ticket Flow

1. A user clicks `Open Ticket`
2. The bot creates a private ticket channel
3. Staff can claim the ticket
4. Staff can close the ticket
5. Closing generates a transcript
6. The transcript is sent to the configured log channel
7. Staff can reopen or delete the ticket
8. Reopened tickets can be claimed again

Example:

```text
Open Ticket
    ↓
ticket-0001
    ↓
Claim
    ↓
Close
    ↓
Confirm Close
    ↓
Transcript Saved
    ↓
Reopen / Delete
```

## Installation

### Requirements

- Node.js
- Discord bot application
- Discord server with permission to add bots

### 1. Clone the project

```bash
git clone https://github.com/muhamedsfan-design/TicketForge
cd TicketForge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
```

### Environment Variables

`DISCORD_TOKEN`

Your Discord bot token.

`CLIENT_ID`

Your Discord application ID.

`GUILD_ID`

The Discord server used for development slash-command registration.

## Running the Bot

Development:

```bash
npm run dev
```

Normal startup:

```bash
npm start
```

Build:

```bash
npm run build
```

## Initial Server Setup

Once the bot is online, run:

```text
/setup-ticket
```

Choose:

- the staff role
- the ticket category
- the transcript/log channel

Then optionally customize the panel:

```text
/ticket-panel-config
```

Finally post it:

```text
/ticket-panel
```

Users can now click the button to create tickets.

## Project Structure

```text
src/
├── commands/
│   ├── tickets/
│   │   ├── setup-ticket.ts
│   │   ├── ticket.ts
│   │   ├── ticket-panel.ts
│   │   └── ticket-panel-config.ts
│   └── utility/
│       └── ping.ts
│
├── database/
│   ├── DatabaseService.ts
│   └── index.ts
│
├── services/
│   ├── CommandRegistrationService.ts
│   ├── CommandService.ts
│   ├── InteractionService.ts
│   └── TicketService.ts
│
├── types/
│   └── Command.ts
│
├── utils/
│   └── EmbedFactory.ts
│
├── config.ts
└── index.ts
```

## Database

The bot uses SQLite.

Ticket data includes:

```text
channel ID
guild ID
owner ID
ticket number
claimed staff member
ticket status
creation time
```

Server configuration includes:

```text
staff role
ticket category
ticket log channel
ticket panel title
ticket panel description
```

The database is stored locally inside:

```text
data/bot.db
```

## Permissions

The bot should have the permissions required to:

- View Channels
- Send Messages
- Read Message History
- Embed Links
- Attach Files
- Manage Channels
- Manage Messages

Avoid giving Administrator permission on production servers unless it is actually necessary.

## Security

The bot token must never be committed to GitHub.

Make sure `.env` is included in `.gitignore`.

Example:

```gitignore
node_modules/
.env
data/*.db
dist/
```

## Built With

- TypeScript
- Node.js
- discord.js
- SQLite
- better-sqlite3

## Future Improvements

Possible future features:

- Web dashboard
- Multiple ticket categories
- Ticket reasons
- Ticket priority
- Staff statistics
- HTML transcripts
- Automatic ticket cleanup
- Custom branding
- Permission presets
- Docker deployment

## License

This project is intended as a portfolio/demo project and can be adapted for custom Discord bot commissions.
