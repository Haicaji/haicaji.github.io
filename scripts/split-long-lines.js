/**
 * Split extremely long lines in index.html into smaller chunks.
 * This prevents GitHub Pages deployment failures caused by lines
 * exceeding internal processing limits (e.g., 20+ MB single-line
 * JavaScript string literals from Logseq Publish).
 *
 * Usage: node scripts/split-long-lines.js [maxChunkSize]
 *   maxChunkSize: max chars per chunk (default: 1048576 = 1MB)
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '..', 'index.html');
const DEFAULT_MAX_CHUNK = 1_048_576; // 1 MB per chunk
const MIN_LINE_LENGTH_TO_SPLIT = 500_000; // 500 KB threshold

function splitLongLines(filePath, maxChunkSize) {
    console.log(`Processing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let modified = false;
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < MIN_LINE_LENGTH_TO_SPLIT) {
            newLines.push(line);
            continue;
        }

        // This line is too long — try to split the JavaScript string literal
        console.log(`Line ${i + 1}: ${line.length.toLocaleString()} chars — splitting...`);

        // Match: <script>window.logseq_db="...CONTENT..."</script>
        // The data uses &quot; for internal quotes, so actual " only appear at boundaries.
        const DB_PREFIX = '<script>window.logseq_db="';
        const DB_SUFFIX = '"</script>';

        let prefix, data, suffix;
        if (line.includes(DB_PREFIX) && line.endsWith(DB_SUFFIX)) {
            prefix = line.substring(0, line.indexOf(DB_PREFIX) + DB_PREFIX.length);
            data = line.substring(prefix.length, line.length - DB_SUFFIX.length);
            suffix = DB_SUFFIX;
        } else {
            // Try generic: split by chunk size boundaries with JS concat
            console.log(`  No recognized pattern, falling back to chunk splitting...`);
            const chunks = [];
            for (let pos = 0; pos < line.length; pos += maxChunkSize) {
                chunks.push(line.slice(pos, pos + maxChunkSize));
            }
            newLines.push(chunks[0] + '" +\n');
            for (let c = 1; c < chunks.length - 1; c++) {
                newLines.push('"' + chunks[c] + '" +\n');
            }
            newLines.push('"' + chunks[chunks.length - 1]);
            modified = true;
            continue;
        }

        // Split the data into chunks
        const chunks = [];
        for (let pos = 0; pos < data.length; pos += maxChunkSize) {
            chunks.push(data.slice(pos, pos + maxChunkSize));
        }

        if (chunks.length <= 1) {
            newLines.push(line);
            continue;
        }

        console.log(`  Split into ${chunks.length} chunks of ~${(maxChunkSize / 1024 / 1024).toFixed(1)} MB each`);

        // Reconstruct with string concatenation
        newLines.push(prefix + chunks[0] + '" +');
        for (let c = 1; c < chunks.length - 1; c++) {
            newLines.push('"' + chunks[c] + '" +');
        }
        newLines.push('"' + chunks[chunks.length - 1] + suffix);

        modified = true;
    }

    if (modified) {
        const newContent = newLines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Done: ${filePath} updated (${newLines.length} lines total)`);
    } else {
        console.log('No lines needed splitting.');
    }
}

// Run
const maxChunkSize = parseInt(process.argv[2], 10) || DEFAULT_MAX_CHUNK;

if (!fs.existsSync(TARGET_FILE)) {
    console.error(`File not found: ${TARGET_FILE}`);
    process.exit(1);
}

splitLongLines(TARGET_FILE, maxChunkSize);
