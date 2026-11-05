/**
 * Ostaad ERP Cloudflare D1 Relational Database Client
 * Sub-Module 1.3: D1 Database Migration Framework & Schema Management
 * 
 * Works natively in Cloudflare Workers Edge runtime (env.DB) with seamless
 * local development and in-memory mock adapters for SSR & CI testing.
 */

export interface D1QueryResult<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
    last_row_id?: number;
    changes?: number;
  };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1QueryResult<T>>;
  run<T = unknown>(): Promise<D1QueryResult<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1QueryResult<T>[]>;
  exec(query: string): Promise<D1QueryResult>;
}

export interface MigrationRecord {
  id: number;
  version: string;
  name: string;
  applied_at: string;
  batch: number;
  checksum?: string;
}

export interface TableSchemaInfo {
  name: string;
  columnsCount: number;
  isView: boolean;
}

// In-memory migration registry for local development and edge SSR
class D1DatabaseService {
  private migrations: MigrationRecord[] = [
    { id: 1, version: "0001", name: "0001_initial_schema.sql", applied_at: "2026-11-01T00:00:00Z", batch: 1 },
    { id: 2, version: "0002", name: "0002_seed_demo_data.sql", applied_at: "2026-11-01T00:00:00Z", batch: 1 },
    { id: 3, version: "0003", name: "0003_multi_company_tenants.sql", applied_at: "2026-11-05T23:00:00Z", batch: 1 },
    { id: 4, version: "0004", name: "0004_d1_migration_tracking.sql", applied_at: "2026-11-05T23:35:00Z", batch: 1 },
    { id: 5, version: "0005", name: "0005_r2_document_vault.sql", applied_at: "2026-11-05T23:45:00Z", batch: 2 },
  ];

  private knownTables: string[] = [
    "tenants",
    "companies",
    "user_company_roles",
    "users",
    "projects",
    "boqs",
    "boq_items",
    "vendors",
    "vendor_categories",
    "purchase_orders",
    "rfqs",
    "vendor_bids",
    "goods_receipt_notes",
    "site_inventory_ledger",
    "invoices",
    "payment_vouchers",
    "document_vault",
    "schema_migrations",
    "login_throttles",
    "audit_logs",
  ];

  /**
   * Retrieves native Cloudflare D1 binding from environment if running inside a Worker
   */
  public getD1Binding(): D1Database | null {
    if (typeof globalThis !== "undefined") {
      const g = globalThis as unknown as { DB?: D1Database; __env__?: { DB?: D1Database } };
      if (g.DB) return g.DB;
      if (g.__env__?.DB) return g.__env__.DB;
    }
    return null;
  }

  /**
   * Type-safe parameterized query returning an array of typed rows
   */
  public async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const d1 = this.getD1Binding();
    if (d1) {
      const stmt = d1.prepare(sql).bind(...params);
      const res = await stmt.all<T>();
      return res.results || [];
    }

    // In local dev/mock mode, return empty array for arbitrary SQL
    return [];
  }

  /**
   * Type-safe parameterized query returning the first row or null
   */
  public async queryFirst<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const d1 = this.getD1Binding();
    if (d1) {
      const stmt = d1.prepare(sql).bind(...params);
      return await stmt.first<T>();
    }
    return null;
  }

  /**
   * Executes a mutation statement (INSERT, UPDATE, DELETE)
   */
  public async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ success: boolean; rowsAffected: number; lastRowId?: number }> {
    const d1 = this.getD1Binding();
    if (d1) {
      const stmt = d1.prepare(sql).bind(...params);
      const res = await stmt.run();
      return {
        success: res.success,
        rowsAffected: res.meta.changes || 0,
        lastRowId: res.meta.last_row_id,
      };
    }

    return { success: true, rowsAffected: 1 };
  }

  /**
   * Executes a batch of statements inside a single atomic D1 transaction
   * If any statement fails, Cloudflare D1 automatically rolls back all changes!
   */
  public async batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<boolean> {
    const d1 = this.getD1Binding();
    if (d1) {
      const preparedList = statements.map((s) => d1.prepare(s.sql).bind(...(s.params || [])));
      const results = await d1.batch(preparedList);
      return results.every((r) => r.success);
    }

    return true;
  }

  /**
   * Returns migration status, applied history, and schema diagnostic overview
   */
  public async getMigrationStatus(): Promise<{
    isLiveD1: boolean;
    databaseName: string;
    databaseId: string;
    appliedMigrations: MigrationRecord[];
    pendingMigrations: string[];
    registeredTables: string[];
  }> {
    const d1 = this.getD1Binding();
    const isLiveD1 = Boolean(d1);

    // List of all migration files expected
    const allFiles = [
      "0001_initial_schema.sql",
      "0002_seed_demo_data.sql",
      "0003_multi_company_tenants.sql",
      "0004_d1_migration_tracking.sql",
    ];

    const appliedNames = this.migrations.map((m) => m.name);
    const pendingMigrations = allFiles.filter((f) => !appliedNames.includes(f));

    return {
      isLiveD1,
      databaseName: "ostaad-erp-db",
      databaseId: "d7dbcaf9-68e4-4869-a4a2-8b939f8b14d0",
      appliedMigrations: this.migrations,
      pendingMigrations,
      registeredTables: this.knownTables,
    };
  }

  /**
   * Records a successfully executed migration into the schema_migrations table
   */
  public async recordMigration(version: string, name: string): Promise<MigrationRecord> {
    const newRecord: MigrationRecord = {
      id: this.migrations.length + 1,
      version,
      name,
      applied_at: new Date().toISOString(),
      batch: 1,
    };

    this.migrations.push(newRecord);

    const d1 = this.getD1Binding();
    if (d1) {
      await d1
        .prepare("INSERT OR IGNORE INTO schema_migrations (version, name, batch) VALUES (?, ?, ?)")
        .bind(version, name, 1)
        .run();
    }

    return newRecord;
  }
}

// Global Singleton for D1 Database Service
const d1Key = Symbol.for("ostaad.erp.d1");
const globalObj = globalThis as unknown as { [key: symbol]: D1DatabaseService };

export const d1Service: D1DatabaseService = globalObj[d1Key] || new D1DatabaseService();
if (process.env.NODE_ENV !== "production") {
  globalObj[d1Key] = d1Service;
}

