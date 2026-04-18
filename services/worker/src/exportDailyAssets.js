import { exportOperationalAssets } from "./earthEngine.js";

function parseArgs(argv) {
  const args = {};
  for (const item of argv.slice(2)) {
    if (item.startsWith("--date=")) {
      args.date = item.slice("--date=".length);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const result = await exportOperationalAssets({ runDate: args.date });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && process.argv[1].endsWith("exportDailyAssets.js")) {
  main().catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  });
}
