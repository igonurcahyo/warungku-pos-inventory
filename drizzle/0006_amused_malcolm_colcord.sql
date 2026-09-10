ALTER TABLE "transactions" ADD COLUMN "payment_method" varchar(20) DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_status" varchar(20) DEFAULT 'paid' NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_payment_status_idx" ON "transactions" USING btree ("payment_status");