#!/usr/bin/env node
import { promises as fs } from "fs"
import path from "path"

const ROOT = process.cwd()
const SOURCE_ROOT = path.join(ROOT, "app", "(modules)", "price-wise", "data-acquisition")
const OUTPUT_SOURCE = path.join(SOURCE_ROOT, "outputs")
const ARCHIVE_SOURCE = path.join(SOURCE_ROOT, "archive")
const DEST_ROOT = path.join(ROOT, "public", "data", "price-wise")
const ARCHIVE_DEST = path.join(DEST_ROOT, "archive")
const VERBOSE = process.env.SYNC_PRICEWISE_VERBOSE === "1"

const summary = {
  copiedFiles: 0,
  missingFiles: [],
  missingDirs: [],
}

const logVerbose = (message) => {
  if (VERBOSE) {
    console.info(message)
  }
}

async function pathExists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function copyFileIfExists(source, destination) {
  if (!(await pathExists(source))) {
    summary.missingFiles.push(source)
    logVerbose(`[sync-pricewise] Missing file: ${source}`)
    return
  }

  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.copyFile(source, destination)
  summary.copiedFiles += 1
  logVerbose(`[sync-pricewise] Copied ${source} -> ${destination}`)
}

async function copyDirectoryContents(sourceDir, destinationDir) {
  if (!(await pathExists(sourceDir))) {
    summary.missingDirs.push(sourceDir)
    logVerbose(`[sync-pricewise] Missing directory: ${sourceDir}`)
    return
  }

  const entries = await fs.readdir(sourceDir, { withFileTypes: true })
  await fs.mkdir(destinationDir, { recursive: true })

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name)
    const destinationPath = path.join(destinationDir, entry.name)

    if (entry.isDirectory()) {
      await copyDirectoryContents(sourcePath, destinationPath)
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, destinationPath)
      summary.copiedFiles += 1
      logVerbose(`[sync-pricewise] Copied ${sourcePath} -> ${destinationPath}`)
    }
  }
}

async function main() {
  await fs.mkdir(DEST_ROOT, { recursive: true })

  const filesToCopy = [
    "pricing_analysis.json",
    "pricing_data.csv",
    "scrape_log.json",
    "daily_progress.json",
    "run_state.json",
  ]

  for (const filename of filesToCopy) {
    await copyFileIfExists(path.join(OUTPUT_SOURCE, filename), path.join(DEST_ROOT, filename))
  }

  await copyDirectoryContents(ARCHIVE_SOURCE, ARCHIVE_DEST)
}

main()
  .then(() => {
    const missingCount = summary.missingFiles.length + summary.missingDirs.length
    const missingMessage = missingCount ? ` (missing ${missingCount} entries)` : ""
    console.info(`[sync-pricewise] Copied ${summary.copiedFiles} files${missingMessage}`)
    if (missingCount && VERBOSE) {
      if (summary.missingFiles.length) {
        console.warn(`[sync-pricewise] Missing files:`, summary.missingFiles)
      }
      if (summary.missingDirs.length) {
        console.warn(`[sync-pricewise] Missing directories:`, summary.missingDirs)
      }
    }
  })
  .catch((error) => {
    console.error("[sync-pricewise] Failed to copy data", error)
    process.exit(1)
  })
