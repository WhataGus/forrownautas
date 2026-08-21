CREATE TABLE "match_damage" (
	"match_id" uuid,
	"source_seat" smallint,
	"target_seat" smallint,
	"damage_type" smallint,
	"amount" smallint NOT NULL,
	CONSTRAINT "match_damage_pkey" PRIMARY KEY("match_id","source_seat","target_seat","damage_type")
);
--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "seat" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "deck_id" uuid;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "placement" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "final_life" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "poison_received" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "mulligans" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "life_gained" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "eliminated_at_seconds" integer;--> statement-breakpoint
ALTER TABLE "match_players" ADD COLUMN "elimination_reason" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "turn_count" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "starting_life" smallint DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "player_count" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "match_players" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
CREATE INDEX "decks_player_id_idx" ON "decks" ("player_id");--> statement-breakpoint
CREATE INDEX "match_players_match_id_idx" ON "match_players" ("match_id");--> statement-breakpoint
CREATE INDEX "match_players_player_id_idx" ON "match_players" ("player_id");--> statement-breakpoint
CREATE INDEX "matches_created_at_idx" ON "matches" ("created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "match_damage" ADD CONSTRAINT "match_damage_match_id_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_deck_id_decks_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE SET NULL;