#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  appendJournalEvent,
  journalHistoryReport,
  readJournalHistory,
} from "./lib/journal-work-history.mjs";

const [command, ...args] = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(`--${name}`);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--")) {
    throw new Error(`Missing --${name}`);
  }
  return args[index + 1];
}

try {
  const history = resolve(option("history"));
  if (command === "append") {
    const event = JSON.parse(readFileSync(resolve(option("event")), "utf8"));
    appendJournalEvent(history, event);
    console.log(`Recorded ${event.eventId}`);
  } else if (command === "report") {
    console.log(journalHistoryReport(readJournalHistory(history)));
  } else {
    throw new Error(
      "Usage: journal-work-history.mjs <append --history FILE --event FILE|report --history FILE>",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
