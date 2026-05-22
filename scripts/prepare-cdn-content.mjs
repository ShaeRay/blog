import { promises as fs } from "node:fs"
import path from "node:path"

const contentDir = path.resolve(process.env.CONTENT_DIR ?? "content")
const buildContentDir = path.resolve(process.env.BUILD_CONTENT_DIR ?? ".quartz-cdn-content")
const cdnUploadDir = path.resolve(process.env.CDN_UPLOAD_DIR ?? ".quartz-cdn-upload")
const cdnBaseUrl = (process.env.CDN_BASE_URL ?? "https://cdn.shaeray.com").replace(/\/+$/, "")

const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"])
const ignoredNames = new Set([".DS_Store", "Thumbs.db", "__MACOSX"])

const toPosix = (value) => value.split(path.sep).join("/")
const encodeUrlPath = (value) => value.split("/").map(encodeURIComponent).join("/")
const isExternalTarget = (value) =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value.trim()) || value.trim().startsWith("data:")

function hasIgnoredSegment(relPath) {
  return relPath
    .split("/")
    .filter(Boolean)
    .some((segment) => ignoredNames.has(segment) || segment.startsWith("."))
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function copyFile(sourcePath, destinationPath) {
  await ensureParent(destinationPath)
  await fs.copyFile(sourcePath, destinationPath)
}

function splitTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<(.+)>$/, "$1")
  const match = target.match(/^([^?#]*)([?#].*)?$/)
  return {
    pathPart: match?.[1] ?? target,
    suffix: match?.[2] ?? "",
  }
}

function resolveContentRelativePath(rawTarget, markdownRelPath, mode = "markdown") {
  const { pathPart, suffix } = splitTarget(rawTarget)

  if (!pathPart || isExternalTarget(pathPart)) {
    return null
  }

  const markdownDir = path.posix.dirname(markdownRelPath)
  const shouldResolveFromContentRoot =
    pathPart.startsWith("/") ||
    (mode === "wiki" && !pathPart.startsWith("./") && !pathPart.startsWith("../"))
  const normalized = shouldResolveFromContentRoot
    ? path.posix.normalize(pathPart.replace(/^\/+/, ""))
    : path.posix.normalize(path.posix.join(markdownDir, pathPart))

  if (!normalized || normalized.startsWith("../") || normalized === "..") {
    return null
  }

  return { relPath: normalized, suffix }
}

function toCdnUrl(relPath, suffix = "") {
  return `${cdnBaseUrl}/${encodeUrlPath(relPath)}${suffix}`
}

function parseWikiImageEmbed(rawValue) {
  const [rawTarget, rawHint = ""] = rawValue.split("|")
  const target = rawTarget.trim()
  const hint = rawHint.trim()
  const dimensionMatch = hint.match(/^(\d+)(?:x(\d+))?$/i)

  return {
    target,
    alt: hint && !dimensionMatch ? hint : path.posix.basename(target, path.posix.extname(target)),
    width: dimensionMatch?.[1],
    height: dimensionMatch?.[2],
  }
}

function buildHtmlImage(url, alt, width, height) {
  const attrs = [`src="${url}"`, `alt="${alt.replaceAll('"', "&quot;")}"`]

  if (width) {
    attrs.push(`width="${width}"`)
  }
  if (height) {
    attrs.push(`height="${height}"`)
  }

  return `<img ${attrs.join(" ")} />`
}

function warnIfMissingImage(markdownRelPath, imageRelPaths, relPath, warnings) {
  if (!imageRelPaths.has(relPath) && !markdownRelPath.startsWith("_templates/")) {
    warnings.add(`${markdownRelPath}: missing image ${relPath}`)
  }
}

function rewriteMarkdownImages(markdown, markdownRelPath, imageRelPaths, warnings) {
  const rewriteWikiImage = (match, rawValue) => {
    const { target, alt, width, height } = parseWikiImageEmbed(rawValue)
    const resolved = resolveContentRelativePath(target, markdownRelPath, "wiki")

    if (!resolved || !imageExtensions.has(path.posix.extname(resolved.relPath).toLowerCase())) {
      return match
    }

    warnIfMissingImage(markdownRelPath, imageRelPaths, resolved.relPath, warnings)

    const url = toCdnUrl(resolved.relPath, resolved.suffix)
    return width || height ? buildHtmlImage(url, alt, width, height) : `![${alt}](${url})`
  }

  const rewriteMarkdownImage = (match, alt, rawTarget) => {
    const resolved = resolveContentRelativePath(rawTarget, markdownRelPath)

    if (!resolved || !imageExtensions.has(path.posix.extname(resolved.relPath).toLowerCase())) {
      return match
    }

    warnIfMissingImage(markdownRelPath, imageRelPaths, resolved.relPath, warnings)

    return `![${alt}](${toCdnUrl(resolved.relPath, resolved.suffix)})`
  }

  const rewriteLine = (line) =>
    line
      .replace(/!\[\[([^\]]+)\]\]/g, rewriteWikiImage)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, rewriteMarkdownImage)

  let inFence = false
  let fenceChar = ""

  return markdown
    .split(/(?<=\n)/)
    .map((line) => {
      const fenceMatch = line.trimStart().match(/^(```+|~~~+)/)

      if (fenceMatch) {
        const currentFenceChar = fenceMatch[1][0]

        if (!inFence) {
          inFence = true
          fenceChar = currentFenceChar
        } else if (currentFenceChar === fenceChar) {
          inFence = false
          fenceChar = ""
        }

        return line
      }

      return inFence ? line : rewriteLine(line)
    })
    .join("")
}

await fs.rm(buildContentDir, { recursive: true, force: true })
await fs.rm(cdnUploadDir, { recursive: true, force: true })
await fs.mkdir(buildContentDir, { recursive: true })
await fs.mkdir(cdnUploadDir, { recursive: true })

const allFiles = (await walk(contentDir))
  .map((filePath) => ({
    absPath: filePath,
    relPath: toPosix(path.relative(contentDir, filePath)),
  }))
  .filter(({ relPath }) => !hasIgnoredSegment(relPath))

const imageFiles = allFiles.filter(({ relPath }) =>
  imageExtensions.has(path.posix.extname(relPath).toLowerCase()),
)
const imageRelPaths = new Set(imageFiles.map(({ relPath }) => relPath))
const warnings = new Set()

let markdownCount = 0
let copiedContentCount = 0
let copiedImageCount = 0

for (const { absPath, relPath } of allFiles) {
  const extension = path.posix.extname(relPath).toLowerCase()

  if (imageExtensions.has(extension)) {
    await copyFile(absPath, path.join(cdnUploadDir, relPath))
    copiedImageCount += 1
    continue
  }

  const destination = path.join(buildContentDir, relPath)

  if (extension === ".md") {
    const markdown = await fs.readFile(absPath, "utf8")
    const rewritten = rewriteMarkdownImages(markdown, relPath, imageRelPaths, warnings)
    await ensureParent(destination)
    await fs.writeFile(destination, rewritten)
    markdownCount += 1
  } else {
    await copyFile(absPath, destination)
    copiedContentCount += 1
  }
}

console.log(
  `Prepared ${markdownCount} Markdown files in ${toPosix(path.relative(process.cwd(), buildContentDir))}`,
)
console.log(
  `Copied ${copiedImageCount} images to ${toPosix(path.relative(process.cwd(), cdnUploadDir))}`,
)

if (copiedContentCount > 0) {
  console.log(`Copied ${copiedContentCount} non-Markdown content files`)
}

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`)
}
