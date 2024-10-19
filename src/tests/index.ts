import { PoolClient } from "pg";
import perf from "perf_hooks";
import * as postgres from "./postgres";
import * as SQM from "../index";
// Models
import * as TestModel from "./TestModel";

(async function main() {
  // const insertQuery = TestModel.db.sqlInsert({
  //   cols: ["info", "status", "info"],
  //   rows: [{
  //     info: { subscription_plan: "basic" }
  //   }],
  //   return: "*",
  // });
  // console.log(insertQuery);
  const test1 = "test1";
  const selectQuery = TestModel.db.sqlSelect({
    cols: ["info", "status", "info"],
    where: [
      ["email", "=", "test1@gmail.com"], "AND",
      ["name", "!=", test1]
    ]
  });
  console.log(selectQuery);
  // const MIGRATIONS = [{
  //     name: "create_table_users",
  //     exec: async (client: PoolClient) => {
  //       await client.query(TestModel.queries.up, []);
  //       await client.query(TestModel.queries.indexStatus, []);
  //     }
  //   }
  // ];

  // const run = async (): Promise<void> => {
  //   const client = await postgres.pool.connect();
  //   try {
  //     await SQM.runPostgresMigrations(client, {
  //       table: "sqmap_migrations",
  //       initialMigrationName: "init_db"
  //     }, MIGRATIONS);
  //   } catch (error) {
  //     console.log(error);
  //     process.exit(1);
  //   } finally {
  //     client.release();
  //   }
  // };
  // run();

  // const client = await postgres.pool.connect();
  // try {
  //   const newUser = await TestModel.db.insert(client, {
  //     // You need to specify all the columns that you want to insert into.
  //     cols: ["status", "username", "email", "info"],
  //     // Any extra column that is not present in the "cols" array will be ignored.
  //     // Missing columns will be inserted as undefined
  //     rows: [{
  //       status: "active",
  //       name: "new user",
  //       email: "test@example.com",
  //       info: {
  //         subscription_plan: "basic"
  //       }
  //     }],
  //     return: ["id"],
  //     debug: {
  //       enable: true,
  //       dryRun: true,
  //       printAll: true
  //     }
  //   });

  //   const newName = "HEY THERE";
  //   for (let i = 0; i < 10; i++) {
  //     const existingUser = await TestModel.db.select(client, {
  //       cols: [
  //         "created",
  //         SQM.raw(`"info"->@@1? AS "sp"`, ["hello"]),
  //         SQM.raw(`JSONB_SET("info", '{hello}', @@1?::TEXT)`, [newName])
  //       ],
  //       where: [{ id: 1 }],
  //       debug: {
  //         enable: true,
  //         dryRun: true,
  //         printAll: true
  //       }
  //     });
  //     console.log(existingUser.rows);
  //   }

  //   const random = [];
  //   const updatedUser = await TestModel.db.update(client, {
  //     set: {
  //       name: "asfs",
  //       status: "active",
  //       // id: SQM.raw(`"id" + $1?`, [1]),
  //       // info: SQM.raw(`JSONB_SET("info", '{hello}', '"@@1?"')`, [newName]),
  //     },
  //     rawSet: {
  //       status: SQM.raw(``),
  //     },
  //     where: [{ id: 1 }],
  //     debug: {
  //       enable: true,
  //       dryRun: true,
  //       printAll: true
  //     }
  //   });
  // } catch (error: any) {
  //   console.log(error);
  // } finally {
  //   client.release();
  // }

  // console.log("WIP");
})();