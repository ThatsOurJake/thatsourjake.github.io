const path = require('path');
const fs = require('fs');
const showdown = require('showdown');
const ejs = require('ejs');
const sass = require('sass');

const WORDS_PER_MIN = 200;

const renderPage = (template, metadata, extraParams = {}) => new Promise((resolve, reject) => {
  ejs.renderFile(path.join(__dirname, 'templates', 'pages', template), {
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
  const { minify } = await import('minify');

  const cwd = process.cwd();
  const buildDir = path.join(cwd, 'build');
  const blogDir = path.join(cwd, 'blog');
  /** @type {{ title: string, datePublished: number, url: string, readingTime: { value: number }, favourite: boolean, hidden: boolean }[]} */
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

      const { title = undefined, datePublished = undefined, lastEdited = undefined, favourite = false, hidden = false } = converter.getMetadata();

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
        hidden,
      });

      // generate article from ejs
      try {
        const outputArticle = await renderPage('article.ejs', metadata, { html });
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
  const nonHiddenPosts = blogPosts.filter(x => !x.hidden).sort((a, b) => b.datePublished - a.datePublished);
  const homepage = await renderPage('home.ejs', { title: 'Home' }, {
    blogPosts: nonHiddenPosts.slice(0, 3),
    favouritePosts: nonHiddenPosts.filter(x => x.favourite).sort((a, b) => b.datePublished - a.datePublished),
  });
  fs.writeFileSync(path.join(docsDir, 'index.html'), homepage);
  console.log(`✨ Homepage Generated`);

  // generate privacy page
  const privacy = await renderPage('privacy.ejs', { title: 'Privacy Policy' });
  fs.writeFileSync(path.join(docsDir, 'privacy.html'), privacy);
  console.log(`✨ Privacy Policy Generated`);

  // generate articles page
  const articlesPage = await renderPage('articles.ejs', { title: 'All Articles' }, { blogPosts: nonHiddenPosts });
  fs.writeFileSync(path.join(docsDir, 'articles', 'index.html'), articlesPage);
  console.log(`✨ Articles page Generated`);

  // build styles
  console.log('');
  console.log('🛠  Compiling SASS 💅🏼');
  const compiled = sass.compile(path.join(__dirname, 'styles', 'style.scss'), {
    loadPaths: [path.resolve('node_modules')],
  });
  console.log('   Minifying 📏');
  const minifiedCss = await minify.css(compiled.css);
  fs.writeFileSync(path.join(docsDir, 'style.css'), minifiedCss);

  if (fs.existsSync(path.join(cwd, 'CNAME'))) {
    console.log('');
    console.log('Copying CNAME');
    fs.cpSync(path.join(cwd, 'CNAME'), path.join(docsDir, 'CNAME'));
  }

  console.log('');
  console.log(`🎇 Build Complete`);
})();
