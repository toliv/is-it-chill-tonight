import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccount } from "next-auth/adapters";

export const users = sqliteTable("user", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name"),
	email: text("email").notNull(),
	emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
	image: text("image"),
});

export type User = Omit<typeof users.$inferSelect, "id">;

export const accounts = sqliteTable(
	"account",
	{
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").$type<AdapterAccount>().notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
	},
	(account) => ({
		compoundKey: primaryKey({
			columns: [account.provider, account.providerAccountId],
		}),
	}),
);

export const sessions = sqliteTable("session", {
	sessionToken: text("sessionToken").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
	"verificationToken",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
	},
	(vt) => ({
		compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
	}),
);

export const venues = sqliteTable(
	"venues",
	{
		id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull()
	}
);

export const surveys = sqliteTable(
	"surveys",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		venueId: text("venueId")
			.notNull()
			.references(() => venues.id, { onDelete: "cascade" }),
		mellowOrDancey: integer("mellowOrDancey").notNull(),
		crowded: integer("crowded").notNull(),
		securityChill: integer("securityChill").notNull(),
		ratio: integer("ratio").notNull(),
		lineSpeed: integer("lineSpeed").notNull(),
		comment: text("comment"),
		createdAt: integer("createdAt", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date()),
	}
);
