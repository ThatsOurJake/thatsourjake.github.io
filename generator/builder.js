const path = require('path');
const fs = require('fs');
const showdown = require('showdown');

const WORDS_PER_MIN = 200;

(async() => {
  const converter = new showdown.Converter({
    emoji: true,
    ghMentions: true,
    metadata: true,
  });

  const buildDir = path.join(process.cwd(), 'build');
  const blogDir = path.join(process.cwd(), 'blog');
  /** @type {{ title: string, datePublished: number, readingTime: { value: number } }[]} */
  const blogPosts = [];

  const docsDir = path.join(buildDir, 'docs');
  const articlesDir = path.join(blogDir, 'articles');
  
  console.log('Building Docs 📚');

  if (fs.existsSync(buildDir)) {
    console.log('Removing existing build dir');

    // delete exiting build dir
    fs.rmSync(buildDir, {
      force: true,
      recursive: true,
    });
  }

  fs.mkdirSync(docsDir, {
    recursive: true
  });

  // find all articles folders
  const postsDirs = fs.readdirSync(articlesDir).filter(p => fs.lstatSync(path.join(articlesDir,  p)).isDirectory());
  console.log(`Found [${postsDirs.length}] posts 🤓`);

  for (let i = 0; i < postsDirs.length; i++) {
    const dir = postsDirs[i];
    const dirPath = path.join(articlesDir, dir);
    const indexFile = path.join(dirPath, 'index.md');

    if (!fs.existsSync(indexFile)){
      console.warn(`No index.md file found under - ${dirPath} 😭`);
      continue;
    }

    const outputDir = path.join(docsDir, dir);
    // create folder under docs names the same as parent folder
    fs.mkdirSync(outputDir, {
      recursive: true
    });

    console.log();
    console.log(`Generating pages for ${dir} 🛠`);
    console.log(`  Output Directory has been created`);
    const markdownFiles = fs.readdirSync(dirPath).filter(p => p.endsWith('.md') && fs.lstatSync(path.join(dirPath,  p)).isFile());
    console.log(`  Found [${markdownFiles.length}] markdown files`);

    for (let j = 0; j < markdownFiles.length; j++) {
      const mdFileName = markdownFiles[j];
      const mdFileLocation = path.join(dirPath, mdFileName);
      const rawText = fs.readFileSync(mdFileLocation).toString('utf-8');
      // convert to html index md
      const html = converter.makeHtml(rawText);

      // calculate word count
      const wordCount = rawText.match(/\S+/g).length;
      const readTime = Math.max(Math.ceil(wordCount / WORDS_PER_MIN), 1);
      
      console.log(`  Generating page for ${mdFileName} | Read time: ${readTime} minute(s)`);

      // generate article page using template
    }

    // copy all pictures other than md
  }


  // generate homepage
    // add latest 3 articles

  // generate articles page

  // output to docs folder
})();
