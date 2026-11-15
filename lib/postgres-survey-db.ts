import postgres from 'postgres';

type Parameter = string | number | null;
type Statement = { sql: string; params: Parameter[] };

const questions = "'Q1','Q2','Q3','Q4','Q5','Q6','Q9','Q10','Q11','Q12'";

function postgresQuery(sql: string) {
  if (sql.includes('json_each(r.answers)')) {
    sql = `SELECT j.key AS question, x.answer, count(*)::int AS n
      FROM responses r
      CROSS JOIN LATERAL jsonb_each(r.answers::jsonb) j
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(j.value) = 'array' THEN j.value ELSE jsonb_build_array(j.value) END
      ) x(answer)
      WHERE j.key IN (${questions})
        AND x.answer IS NOT NULL
        AND (?='' OR r.created_at>=?) AND (?='' OR r.created_at<?)
      GROUP BY question, answer`;
  }
  let index = 0;
  return sql
    .replace("date(created_at,'+9 hours')", "((created_at::timestamptz AT TIME ZONE 'Asia/Seoul')::date)::text")
    .replace('SET count=count+1', 'SET count=rate_limits.count+1')
    .replace('count(*) AS n', 'count(*)::int AS n')
    .replace(/\?/g, () => '$' + ++index);
}

export function createPostgresDatabase(url: string) {
  const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n').trim();
  const client = postgres(url, {
    prepare: false,
    ssl: ca ? { ca, rejectUnauthorized: true } : 'verify-full',
    max: 2,
  });
  return {
    prepare(sql: string) {
      return {
        bind(...params: Parameter[]) {
          const statement = { sql: postgresQuery(sql), params };
          const execute = () => client.unsafe(statement.sql, statement.params);
          return {
            statement,
            async first() { return (await execute())[0] ?? null; },
            async all() { return { results: await execute() }; },
            async run() { await execute(); },
          };
        },
      };
    },
    async batch(queries: { statement: Statement }[]) {
      await client.begin(async transaction => {
        for (const { statement } of queries) {
          await transaction.unsafe(statement.sql, statement.params);
        }
      });
    },
  };
}
