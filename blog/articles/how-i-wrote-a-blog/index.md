---
title: How I wrote a blog
datePublished: 2023-09-05T13:00:00.000Z
---

What better first main blog post than explaining how the site that hosts my blog was made. **tldr:** [Source Code](https://github.com/ThatsOurJake/thatsourjake.github.io).

First i'll preface this with some caveats
- This framework has been made specifically to my workflow
- It's a major WIP and will evolve over time
- I didn't want to use a prebuilt framework like Gatsby as I wanted this site to feel more personal

Now that's out the way the tech stack, it's a simple tech stack for hosting - [GitHub Pages](https://pages.github.com/) with a custom domain routed via cloudflare. As for the what I call the `builder`, this script handles the generation of the site, it's written in Javascript and uses the [EJS](https://ejs.co/) templating engine. The script will a set of basic steps
- Find all markdown files within a specified directory
- Parse these using [showdown](https://www.npmjs.com/package/showdown)
- Calculate Reading time
- Generate full html pages using EJS and prebuilt templates
- Save html files to output directory
- Copy any other assets like images
- Generate the homepage, articles page, privacy policy
- Compile SASS
- Done!

There are some other missing steps like validation but that is the general inner workings. The deployment script is still very much a work in progress and has already caused many issues, but the idea behind it:
- Build the site
- Checkout to the `blog` branch
- Commit the docs
- Push
- GitHub actions does the rest

Some other honourable mentions are I'm using [PM2](https://www.npmjs.com/package/pm2), [nodemon](https://www.npmjs.com/package/nodemon) and [http-server](https://www.npmjs.com/package/http-server) to make it easier to locally write and view the articles. If you're curious then the [Source Code](https://github.com/ThatsOurJake/thatsourjake.github.io) is open on my GitHub.
