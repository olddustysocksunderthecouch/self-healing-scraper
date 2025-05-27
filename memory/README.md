# Memory Directory

This directory contains memory files used by the self-healing scraper system.

## Structure

- **data/**: Contains scrape history files in JSON format, organized by scraper ID
- **healing/**: Contains healing memory markdown files that track healing attempts and their outcomes

## Data Files

Each scraper has its own JSON file in the `data/` directory that stores a history of scrape results.
These files are used to track changes over time and to detect patterns in the data.

## Healing Memory Files

Each scraper has a corresponding markdown file in the `healing/` directory with the format `{scraperId}_HEALING_MEMORY.md`.
These files store information about healing attempts, including:

- Timestamp of each healing event
- Whether the healing was successful
- Which fields were missing or broken
- The changes made during healing
- The reasoning behind the changes

This information is used by Claude to make more informed decisions when healing scrapers in the future.

## Miss Counter

The `data/` directory also contains a `miss_counter.json` file that tracks consecutive missing field occurrences.
This is used to determine when to trigger the healing process.