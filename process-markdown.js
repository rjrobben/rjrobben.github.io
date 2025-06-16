const fs = require('fs-extra');
const path = require('path');
const MarkdownIt = require('markdown-it');
const mdFootnote = require('markdown-it-footnote'); // For footnotes

// Initialize MarkdownIt with HTML enabled and footnote plugin
const md = new MarkdownIt({ html: true }).use(mdFootnote);

// Helper to escape characters for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function processMarkdown(markdownFilePath) {
    try {
        const sourceDir = path.dirname(markdownFilePath);
        let rawMarkdown = await fs.readFile(markdownFilePath, 'utf-8');

        let postTitle = 'My New Post';
        const titleMatch = rawMarkdown.match(/^#\s+(.*)/m);
        if (titleMatch && titleMatch[1]) {
            postTitle = titleMatch[1].trim();
        }

        const postsDir = path.join(__dirname, 'posts');
        await fs.ensureDir(postsDir);
        const blogImagesDir = path.join(__dirname, 'img', 'blog_images');
        await fs.ensureDir(blogImagesDir);

        const imageRegex = /!\[(.*?)\]\((?!https?:\/\/)(.*?)\)/g;
        let match;
        const uniqueImages = new Map();
        
        // Create a temporary string for regex matching to avoid issues with exec on a modified string
        let markdownForImageExtraction = rawMarkdown; 
        while ((match = imageRegex.exec(markdownForImageExtraction)) !== null) {
            const altText = match[1];
            const rawCapturedPath = match[2]; // Path exactly as captured from markdown, possibly with quotes

            // Clean surrounding quotes from the captured path for file system operations
            let cleanedOriginalImagePath = rawCapturedPath;
            if (cleanedOriginalImagePath.length >= 2 && ((cleanedOriginalImagePath.startsWith('"') && cleanedOriginalImagePath.endsWith('"')) || (cleanedOriginalImagePath.startsWith("'") && cleanedOriginalImagePath.endsWith("'")))) {
                cleanedOriginalImagePath = cleanedOriginalImagePath.substring(1, cleanedOriginalImagePath.length - 1);
            }

            // Use the cleaned path as the key for uniqueness and for file operations
            if (!uniqueImages.has(cleanedOriginalImagePath)) {
                const imageName = path.basename(cleanedOriginalImagePath);
                const sourceImagePath = path.resolve(sourceDir, cleanedOriginalImagePath);
                
                const imageSubDir = path.dirname(cleanedOriginalImagePath);
                const targetImageDir = imageSubDir === '.' ? blogImagesDir : path.join(blogImagesDir, imageSubDir);
                await fs.ensureDir(targetImageDir);
                const targetImagePathOnDisk = path.join(targetImageDir, imageName);
                
                const htmlPathBase = path.join('..', 'img', 'blog_images', cleanedOriginalImagePath);
                const relativeTargetPathForHtml = htmlPathBase
                    .replace(/\\/g, '/') 
                    .split('/')
                    .map(segment => (segment === '..' || segment === '.') ? segment : encodeURIComponent(decodeURIComponent(segment)))
                    .join('/');

                uniqueImages.set(cleanedOriginalImagePath, { // Keyed by cleaned path
                    sourceImagePath,
                    targetImagePathOnDisk,
                    rawCapturedPath, // Store the raw path for accurate regex replacement
                    cleanedOriginalImagePath, 
                    relativeTargetPathForHtml,
                    altText
                });

                if (await fs.pathExists(sourceImagePath)) {
                    await fs.copy(sourceImagePath, targetImagePathOnDisk);
                    console.log(`Copied image: ${sourceImagePath} to ${targetImagePathOnDisk}`);
                } else {
                    console.warn(`Image not found: ${sourceImagePath}`);
                }
            }
        }
        
        // Replace markdown image syntax with HTML <img> tags in the main rawMarkdown string
        for (const imgData of uniqueImages.values()) {
            // Use imgData.rawCapturedPath for the regex to match exactly what was in the markdown
            const markdownImageRegexToReplace = new RegExp(
                `!\\[${escapeRegExp(imgData.altText)}\\]\\(${escapeRegExp(imgData.rawCapturedPath)}\\)`,
                'g'
            );
            rawMarkdown = rawMarkdown.replace(
                markdownImageRegexToReplace, 
                `<img src="${imgData.relativeTargetPathForHtml}" alt="${imgData.altText}">`
            );
        }

        let markdownHtmlContent = md.render(rawMarkdown);

        const now = new Date();
        const publicationTimestamp = now.toISOString();
        const formattedPublicationDate = `${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;

        const finalHtmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${postTitle}</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <header>
        <div class="brand-name">ray yip</div>
        <button id="nav-toggle" aria-expanded="false" aria-controls="main-nav">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <nav id="main-nav">
            <ul>
                <li><a href="/">Posts</a></li>
                <li><a href="/pages/about.html">About</a></li>
                <li><a href="/pages/projects.html">Projects</a></li>
                <li><a href="/pages/contact.html">Contact</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <article>
            <h1>${postTitle}</h1>
            <p class="publication-info">
                <time datetime="${publicationTimestamp}">Published on ${formattedPublicationDate}</time>
            </p>
            ${markdownHtmlContent.replace(/^<h1>.*<\/h1>\s*/i, '')}
        </article>
    </main>
    <script src="../js/main.js"></script>
</body>
</html>`;

        const baseName = path.basename(markdownFilePath, path.extname(markdownFilePath));
        const outputHtmlPath = path.join(postsDir, `${baseName}.html`);

        await fs.writeFile(outputHtmlPath, finalHtmlDocument, 'utf-8');
        console.log(`Successfully converted ${markdownFilePath} to ${outputHtmlPath}`);

    } catch (error) {
        console.error('Error processing markdown file:', error);
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('markdown-it-footnote')) {
            console.error("It seems 'markdown-it-footnote' is not installed. Please run: npm install markdown-it-footnote");
        }
        process.exit(1);
    }
}

const inputFile = process.argv[2];
if (!inputFile) {
    console.error('Please provide the path to the markdown file (e.g., _source_markdown/your_folder/your_file.md).');
    process.exit(1);
}
processMarkdown(path.resolve(inputFile));
