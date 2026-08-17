const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const config = require("./config");
const logger = require("./logger");

const BACKUP_DIR = path.resolve(__dirname, "../../db_backups");
const RETENTION_DAYS = 14;

const { host, user, passwd, db } = config.databases.central;

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const cleanupOldBackups = async () => {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = await fs.promises.readdir(BACKUP_DIR).catch(() => []);
  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = await fs.promises.stat(filePath).catch(() => null);
    if (stats && stats.mtimeMs < cutoff) {
      await fs.promises
        .unlink(filePath)
        .catch((err) =>
          logger.warn(`Could not remove old backup ${file}: ${err.message}`)
        );
    }
  }
};

const runBackup = async () => {
  await fs.promises.mkdir(BACKUP_DIR, { recursive: true });

  const outputFile = path.join(BACKUP_DIR, `${db}-${timestamp()}.sql.gz`);
  const writeStream = fs.createWriteStream(outputFile);
  const gzip = zlib.createGzip();

  // Pass the password via env (MYSQL_PWD) instead of interpolating it into
  // the command string. The previous version built a shell command with
  // `exec()` and the password inline as `--password=...` — that puts the
  // plaintext password in the process list (visible to any other user on
  // the box via `ps aux`) and, since exec() runs through a shell, opens
  // the door to shell injection if any of these values ever contain
  // special characters. spawn() with no shell + env var avoids both.
  const dump = spawn(
    "mysqldump",
    ["--host", host, "--user", user, "--single-transaction", "--routines", db],
    { env: { ...process.env, MYSQL_PWD: passwd } }
  );

  let stderrOutput = "";
  dump.stderr.on("data", (chunk) => {
    stderrOutput += chunk.toString();
  });

  dump.stdout.pipe(gzip).pipe(writeStream);

  return new Promise((resolve, reject) => {
    dump.on("error", reject);
    writeStream.on("error", reject);
    writeStream.on("finish", () => {
      if (stderrOutput) {
        logger.warn(`mysqldump stderr: ${stderrOutput.trim()}`);
      }
      resolve(outputFile);
    });
    dump.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `mysqldump exited with code ${code}: ${stderrOutput.trim()}`
          )
        );
      }
    });
  });
};

(async () => {
  try {
    const outputFile = await runBackup();
    logger.info(`Backup created successfully: ${outputFile}`);
    await cleanupOldBackups();
    process.exit(0);
  } catch (error) {
    logger.error(`Backup failed: ${error.message}`);
    process.exit(1);
  }
})();
