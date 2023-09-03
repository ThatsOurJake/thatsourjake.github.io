const path = require('path');
const fs = require('fs');
const showdown = require('showdown');
const ejs = require('ejs');

const WORDS_PER_MIN = 200;

const renderTemplate = (template, metadata, extraParams = {}) => new Promise((resolve, reject) => {
  ejs.renderFile(path.join(__dirname, 'templates', template), {
    metadata,
    ...extraParams
  }, (err, str) => {
    if (err) {
      return reject(err);
    }

    return resolve(str)
  });
});

(async() => {
  const buildDir = path.join(process.cwd(), 'build');
  const blogDir = path.join(process.cwd(), 'blog');
  /** @type {{ title: string, datePublished: number, url: string, readingTime: { value: number }, favourite: boolean }[]} */
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

    const outputDir = path.join(docsDir, 'articles', dir);
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
      const converter = new showdown.Converter({
        emoji: true,
        ghMentions: true,
        metadata: true,
        headerLevelStart: 2,
        parseImgDimensions: true,
      });

      const mdFileName = markdownFiles[j];
      const mdFileLocation = path.join(dirPath, mdFileName);
      const rawText = fs.readFileSync(mdFileLocation).toString('utf-8');
      // convert to html index md
      const html = converter.makeHtml(rawText);

      // calculate word count
      const wordCount = rawText.match(/\S+/g).length;
      const readTime = Math.max(Math.ceil(wordCount / WORDS_PER_MIN), 1);
      
      console.log(`  Generating page for ${mdFileName} | Read time: ${readTime} minute(s)`);

      const { title = undefined, datePublished = undefined, lastEdited = undefined, favourite = false } = converter.getMetadata();

      if (!title) {
        console.warn(`  ⚠️  Article does not contain a title - Skipping`);
        continue;
      }

      if (!datePublished) {
        console.warn(`  ⚠️  Article does not contain a datePublished - Skipping`);
        continue;
      }

      const metadata = {
        title,
        datePublished,
        lastEdited,
        readTime,
      };

      const urlSlug = mdFileName.replace('.md', '');
      const url = urlSlug === 'index' ? `/articles/${dir}/` : `/articles/${dir}/${urlSlug}`;

      blogPosts.push({
        url,
        title,
        datePublished: new Date(datePublished).valueOf(),
        readingTime: {
          value: readTime,
        },
        favourite,
      });

      // generate article from ejs
      try {
        const outputArticle = await renderTemplate('article.ejs', metadata, { html });
        fs.writeFileSync(path.join(outputDir, `${urlSlug}.html`), outputArticle);
        console.log(`  ✨ Generated`);
      } catch (error) {
        console.error(` Failure: ${error.message}`);
        console.error(error.stack);
      }
    }

    // copy all assets other than md
    const assets = fs.readdirSync(dirPath).filter(p => !p.endsWith('.md') && fs.lstatSync(path.join(dirPath,  p)).isFile());

    for (let j = 0; j < assets.length; j++) {
      const asset = assets[j];
      fs.copyFileSync(path.join(dirPath, asset), path.join(outputDir, asset));
    }
  }

  // generate homepage
  const homepage = await renderTemplate('home.ejs', { title: 'Home' }, {
    blogPosts: blogPosts.sort((a, b) => b.datePublished - a.datePublished).slice(0, 3),
    favouritePosts: blogPosts.filter(x => x.favourite).sort((a, b) => b.datePublished - a.datePublished),
  });
  fs.writeFileSync(path.join(docsDir, 'index.html'), homepage);
  console.log(`✨ Homepage Generated`);

  // generate privacy page
  const privacy = await renderTemplate('privacy.ejs', { title: 'Privacy Policy' });
  fs.writeFileSync(path.join(docsDir, 'privacy.html'), privacy);
  console.log(`✨ Privacy Policy Generated`);

  // generate articles page
  const articlesPage = await renderTemplate('articles.ejs', { title: 'All Articles' }, { blogPosts });
  fs.writeFileSync(path.join(docsDir, 'articles', 'index.html'), articlesPage);
  console.log(`✨ Articles page Generated`);

  console.log(`🎇 Done - You can now run 'npm run publish'`);
})();
