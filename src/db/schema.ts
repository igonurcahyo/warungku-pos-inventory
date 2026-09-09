import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  uniqueIndex,
  index,
  text,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 100 }).notNull(),

    whatsapp: varchar('whatsapp', { length: 20 }).notNull(),

    email: varchar('email', { length: 255 }).notNull(),

    passwordHash: varchar('password_hash', { length: 255 }).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
)

export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),

  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 150 }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),

  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 100 }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const products = pgTable('products', {
  id: serial('id').primaryKey(),

  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),

  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),

  name: varchar('name', { length: 255 }).notNull(),

  price: integer('price').notNull().default(0),

  stock: integer('stock').notNull().default(0),

  unit: varchar('unit', { length: 50 }).notNull().default('Pcs'),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),

  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),

  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  type: varchar('type', { length: 10 }).notNull(), // 'IN' | 'OUT'

  quantity: integer('quantity').notNull(),

  note: text('note'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),

    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    total: integer('total').notNull(),

    paidAmount: integer('paid_amount').notNull(),

    changeAmount: integer('change_amount').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    storeIdIdx: index('transactions_store_id_idx').on(table.storeId),
    createdAtIdx: index('transactions_created_at_idx').on(table.createdAt),
  }),
)

export const transactionItems = pgTable(
  'transaction_items',
  {
    id: serial('id').primaryKey(),

    transactionId: integer('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),

    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    productName: varchar('product_name', { length: 255 }).notNull(),

    price: integer('price').notNull(),

    quantity: integer('quantity').notNull(),

    subtotal: integer('subtotal').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    transactionIdIdx: index('transaction_items_transaction_id_idx').on(
      table.transactionId,
    ),
  }),
)

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type TransactionItem = typeof transactionItems.$inferSelect
export type NewTransactionItem = typeof transactionItems.$inferInsert
