import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { findCandidateJoins } from './candidateJoins.js';
import { createSandbox, SandboxSession } from './createSandbox.js';
import { validateSql } from './validateSql.js';

describe('Sandbox Validation (validateSql)', () => {
  it('allows valid SELECT query', () => {
    const res = validateSql('SELECT 1 as num, 2 as val');
    assert.equal(res.isValid, true);
    assert.equal(res.sanitizedSql, 'SELECT 1 as num, 2 as val');
  });

  it('allows valid WITH ... SELECT query', () => {
    const res = validateSql('WITH cte AS (SELECT 10 as x) SELECT * FROM cte;');
    assert.equal(res.isValid, true);
    assert.equal(res.sanitizedSql, 'WITH cte AS (SELECT 10 as x) SELECT * FROM cte');
  });

  it('allows semicolons inside string literals', () => {
    const res = validateSql("SELECT 'hello; world' as message;");
    assert.equal(res.isValid, true);
  });

  it('strips comments safely without allowing hidden keywords', () => {
    const validWithComment = validateSql('SELECT /* safe comment */ 42 as answer');
    assert.equal(validWithComment.isValid, true);

    const maliciousWithComment = validateSql('/* safe comment */ DROP TABLE users;');
    assert.equal(maliciousWithComment.isValid, false);
    assert.match(maliciousWithComment.error || '', /Forbidden SQL keyword detected/i);
  });

  it('blocks DROP TABLE', () => {
    const res = validateSql('DROP TABLE users;');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /Forbidden SQL keyword detected/i);
  });

  it('blocks COPY ... TO', () => {
    const res = validateSql("COPY users TO '/tmp/leak.csv';");
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /Forbidden SQL keyword detected/i);
  });

  it('blocks read_csv and read_csv_auto', () => {
    const res1 = validateSql("SELECT * FROM read_csv('/etc/passwd');");
    assert.equal(res1.isValid, false);
    assert.match(res1.error || '', /Forbidden SQL function detected/i);

    const res2 = validateSql("SELECT * FROM read_csv_auto('secret.csv');");
    assert.equal(res2.isValid, false);
    assert.match(res2.error || '', /Forbidden SQL function detected/i);
  });

  it('blocks SET enable_external_access=true', () => {
    const res = validateSql('SET enable_external_access=true;');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /Forbidden SQL keyword detected/i);
  });

  it('blocks multiple statements separated by semicolon', () => {
    const res = validateSql('SELECT 1 as a; SELECT 2 as b;');
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /Multiple SQL statements are not allowed/i);
  });

  it('blocks queries over 4,000 characters', () => {
    const longQuery = 'SELECT ' + '1+'.repeat(2001) + '1';
    const res = validateSql(longQuery);
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /exceeds maximum allowed length/i);
  });
});

describe('Candidate Joins (findCandidateJoins)', () => {
  it('detects candidate join across two tables with matching key patterns', () => {
    const tables = [
      {
        tableName: 'orders',
        columns: [
          { name: 'order_id', type: 'BIGINT' },
          { name: 'customer_id', type: 'BIGINT' },
          { name: 'total', type: 'DOUBLE' },
        ],
      },
      {
        tableName: 'customers',
        columns: [
          { name: 'id', type: 'BIGINT' },
          { name: 'name', type: 'VARCHAR' },
          { name: 'country', type: 'VARCHAR' },
        ],
      },
    ];

    const joins = findCandidateJoins(tables);
    assert.equal(joins.length, 1);
    assert.equal(joins[0].left, 'orders.customer_id');
    assert.equal(joins[0].right, 'customers.id');
  });

  it('detects candidate join when column names match identically', () => {
    const tables = [
      {
        tableName: 'departments',
        columns: [
          { name: 'dept_id', type: 'BIGINT' },
          { name: 'dept_name', type: 'VARCHAR' },
        ],
      },
      {
        tableName: 'employees',
        columns: [
          { name: 'emp_id', type: 'BIGINT' },
          { name: 'dept_id', type: 'BIGINT' },
          { name: 'emp_name', type: 'VARCHAR' },
        ],
      },
    ];

    const joins = findCandidateJoins(tables);
    assert.equal(joins.length, 1);
    assert.equal(joins[0].left, 'departments.dept_id');
    assert.equal(joins[0].right, 'employees.dept_id');
  });
});

describe('Multi-Table Sandbox Execution (createSandbox)', () => {
  let tmpDir: string;
  let ordersCsvPath: string;
  let customersCsvPath: string;
  let sandbox: SandboxSession;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sqlrag-sandbox-test-'));

    ordersCsvPath = path.join(tmpDir, 'orders.csv');
    customersCsvPath = path.join(tmpDir, 'customers.csv');

    const ordersData = [
      'order_id,customer_id,total',
      '1,101,150.50',
      '2,102,49.99',
      '3,101,200.00',
    ].join('\n');

    const customersData = [
      'customer_id,customer_name,country',
      '101,Acme Corp,USA',
      '102,Globex,Canada',
      '103,Initech,USA',
    ].join('\n');

    await fs.writeFile(ordersCsvPath, ordersData);
    await fs.writeFile(customersCsvPath, customersData);

    sandbox = await createSandbox([
      { tableName: 'orders', filePath: ordersCsvPath },
      { tableName: 'customers', filePath: customersCsvPath },
    ]);
  });

  after(async () => {
    if (sandbox) {
      sandbox.close();
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('runs a valid single-table query', async () => {
    const res = await sandbox.execute('SELECT COUNT(*) as count, SUM(total) as rev FROM orders');
    assert.equal(res.rowCount, 1);
    assert.deepEqual(res.columns, ['count', 'rev']);
    assert.equal(Number(res.rows[0].count), 3);
    assert.equal(Number(res.rows[0].rev), 400.49);
    assert.equal(res.truncated, false);
  });

  it('runs a valid two-table join query', async () => {
    const sql = `
      SELECT c.country, SUM(o.total) as revenue
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      GROUP BY c.country
      ORDER BY revenue DESC
    `;
    const res = await sandbox.execute(sql);
    assert.equal(res.rowCount, 2);
    assert.deepEqual(res.columns, ['country', 'revenue']);
    assert.equal(res.rows[0].country, 'USA');
    assert.equal(Number(res.rows[0].revenue), 350.5);
  });

  it('rejects DROP TABLE attempts', async () => {
    await assert.rejects(
      async () => {
        await sandbox.execute('DROP TABLE orders');
      },
      {
        message: /Forbidden SQL keyword detected: "DROP"/,
      }
    );
  });

  it('rejects COPY ... TO attempts', async () => {
    await assert.rejects(
      async () => {
        await sandbox.execute("COPY orders TO 'leak.csv'");
      },
      {
        message: /Forbidden SQL keyword detected: "COPY"/,
      }
    );
  });

  it('rejects read_csv attempts and is blocked by sandbox config', async () => {
    await assert.rejects(
      async () => {
        await sandbox.execute("SELECT * FROM read_csv('/etc/passwd')");
      },
      {
        message: /Forbidden SQL function detected: "read_csv\(\)"/,
      }
    );
  });

  it('rejects SET enable_external_access=true attempts', async () => {
    await assert.rejects(
      async () => {
        await sandbox.execute('SET enable_external_access=true;');
      },
      {
        message: /Forbidden SQL keyword detected: "SET"/,
      }
    );
  });

  it('truncates results and flags truncated=true when rows exceed maxRows', async () => {
    const res = await sandbox.execute('SELECT * FROM orders', { maxRows: 2 });
    assert.equal(res.rowCount, 2);
    assert.equal(res.rows.length, 2);
    assert.equal(res.truncated, true);
  });

  it('interrupts and times out long-running queries', async () => {
    // Generate 1 billion rows with a 10ms timeout
    const heavySql = `
      SELECT COUNT(*)
      FROM range(1, 100000000) a, range(1, 10) b
    `;
    await assert.rejects(
      async () => {
        await sandbox.execute(heavySql, { timeoutMs: 10 });
      },
      {
        message: /Query execution timed out/i,
      }
    );
  });
});
