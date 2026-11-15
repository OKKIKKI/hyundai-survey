import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const responses = sqliteTable('responses', {
 id: text('id').primaryKey(), createdAt: text('created_at').notNull(),
 answers: text('answers').notNull(), prize: integer('prize').notNull(),
 interview: text('interview').notNull(), q11Applicable: integer('q11_applicable').notNull(), receiptHash: text('receipt_hash').notNull(),
}, t => [index('responses_created').on(t.createdAt)]);
export const contacts = sqliteTable('contacts', {
 responseId: text('response_id').primaryKey().references(()=>responses.id),
 phone: text('phone').notNull(), consentAt: text('consent_at').notNull(),
 consentVersion: text('consent_version').notNull(), notice: text('notice').notNull(), shipmentCompletedAt: text('shipment_completed_at'), expiresAt: text('expires_at').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {key:text('key').primaryKey(), count:integer('count').notNull(), expiresAt:integer('expires_at').notNull()});
export const audit = sqliteTable('audit', {id:text('id').primaryKey(), at:text('at').notNull(), actor:text('actor').notNull(), action:text('action').notNull(), target:text('target')});
